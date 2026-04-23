import React, { useEffect } from 'react';
import { View, StyleSheet, FlatList, RefreshControl, TouchableOpacity } from 'react-native';
import { Text, Card, ActivityIndicator, Chip } from 'react-native-paper';
import { useBookings } from '../../hooks/useBookings';
import { colors } from '../../utils/colors';
import { formatDate, formatCurrency } from '../../utils/helpers';

export default function MyBookingsScreen({ navigation }) {
  const { userBookings, fetchUserBookings, isLoading } = useBookings();

  useEffect(() => {
    fetchUserBookings();
  }, []);

  const getStatusColor = (status) => {
    switch (status) {
      case 'confirmed': return colors.success;
      case 'cancelled': return colors.error;
      case 'pending_payment': return colors.warning;
      default: return colors.disabled;
    }
  };

  const renderBookingCard = ({ item }) => (
    <TouchableOpacity onPress={() => navigation.navigate('BookingDetail', { reference: item.booking_reference })}>
      <Card style={styles.card}>
        <Card.Content>
          <View style={styles.cardHeader}>
            <Text variant="titleMedium">{item.booking_reference}</Text>
            <Chip mode="outlined" style={{ borderColor: getStatusColor(item.status) }} textStyle={{ color: getStatusColor(item.status) }}>
              {item.status}
            </Chip>
          </View>
          <Text>{item.origin} → {item.destination}</Text>
          <Text>Departure: {formatDate(item.departure_time)}</Text>
          <Text>Amount: {formatCurrency(item.total_amount)}</Text>
          <Text>Booked on: {formatDate(item.created_at)}</Text>
        </Card.Content>
      </Card>
    </TouchableOpacity>
  );

  if (isLoading && userBookings.length === 0) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={userBookings}
        keyExtractor={(item) => item.id.toString()}
        renderItem={renderBookingCard}
        refreshControl={<RefreshControl refreshing={isLoading} onRefresh={() => fetchUserBookings()} />}
        contentContainerStyle={styles.list}
        ListEmptyComponent={<Text style={styles.emptyText}>No bookings yet</Text>}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  list: { padding: 16 },
  card: { marginBottom: 12, elevation: 2 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  emptyText: { textAlign: 'center', marginTop: 40, color: colors.textSecondary },
});