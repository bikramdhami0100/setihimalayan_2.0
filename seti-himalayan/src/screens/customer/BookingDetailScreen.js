import React, { useEffect, useState } from 'react';
import { View, StyleSheet, ScrollView, Alert } from 'react-native';
import { Text, Card, Button, ActivityIndicator, Chip } from 'react-native-paper';
import { useBookings } from '../../hooks/useBookings';
import { colors } from '../../utils/colors';
import { formatDateTime, formatCurrency } from '../../utils/helpers';

export default function BookingDetailScreen({ route, navigation }) {
  const { reference } = route.params;
  const { getBookingByReference, cancelBooking, isLoading } = useBookings();
  const [booking, setBooking] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadBooking();
  }, []);

  const loadBooking = async () => {
    const result = await getBookingByReference(reference);
    if (result.success) {
      setBooking(result.booking);
    }
    setLoading(false);
  };

  const handleCancel = () => {
    Alert.alert('Cancel Booking', 'Are you sure you want to cancel this booking?', [
      { text: 'No', style: 'cancel' },
      {
        text: 'Yes, Cancel',
        style: 'destructive',
        onPress: async () => {
          const result = await cancelBooking(reference, 'Cancelled by user');
          if (result.success) {
            loadBooking();
          }
        },
      },
    ]);
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (!booking) {
    return (
      <View style={styles.errorContainer}>
        <Text>Booking not found</Text>
      </View>
    );
  }

  const canCancel = booking.status === 'confirmed' || booking.status === 'pending_payment';

  return (
    <ScrollView style={styles.container}>
      <Card style={styles.card}>
        <Card.Content>
          <Text variant="titleMedium">Booking Reference</Text>
          <Text variant="headlineSmall">{booking.booking_reference}</Text>
          <Chip mode="outlined" style={{ marginTop: 8, alignSelf: 'flex-start', borderColor: colors.primary }}>
            {booking.status}
          </Chip>
        </Card.Content>
      </Card>

      <Card style={styles.card}>
        <Card.Content>
          <Text variant="titleMedium">Journey Details</Text>
          <Text>{booking.origin} → {booking.destination}</Text>
          <Text>Departure: {formatDateTime(booking.departure_time)}</Text>
          <Text>Bus: {booking.bus_number} ({booking.bus_type})</Text>
          <Text>Seats: {booking.selected_seats?.join(', ')}</Text>
        </Card.Content>
      </Card>

      <Card style={styles.card}>
        <Card.Content>
          <Text variant="titleMedium">Passenger Details</Text>
          <Text>Name: {booking.passenger_details?.name}</Text>
          <Text>Age: {booking.passenger_details?.age || 'N/A'}</Text>
          <Text>Gender: {booking.passenger_details?.gender || 'N/A'}</Text>
        </Card.Content>
      </Card>

      <Card style={styles.card}>
        <Card.Content>
          <Text variant="titleMedium">Payment</Text>
          <Text>Total Amount: {formatCurrency(booking.total_amount)}</Text>
          <Text>Booked on: {formatDateTime(booking.created_at)}</Text>
          {booking.confirmed_at && <Text>Confirmed on: {formatDateTime(booking.confirmed_at)}</Text>}
        </Card.Content>
      </Card>

      {booking.status === 'confirmed' && (
        <Button mode="contained" onPress={() => navigation.navigate('TicketScreen', { reference: booking.booking_reference })} style={styles.ticketButton}>
          View Ticket
        </Button>
      )}

      {canCancel && (
        <Button mode="outlined" onPress={handleCancel} style={styles.cancelButton} textColor={colors.error}>
          Cancel Booking
        </Button>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background, padding: 16 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  errorContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  card: { marginBottom: 16, elevation: 2 },
  ticketButton: { marginTop: 8, marginBottom: 8, backgroundColor: colors.primary },
  cancelButton: { marginBottom: 16, borderColor: colors.error },
});