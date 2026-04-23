import React, { useState, useEffect } from 'react';
import { View, StyleSheet, Share, Platform } from 'react-native';
import { Text, Card, Button, ActivityIndicator } from 'react-native-paper';
import QRCode from 'react-native-qrcode-svg';
import { useBookings } from '../../hooks/useBookings';
import { colors } from '../../utils/colors';
import { formatDateTime, formatCurrency } from '../../utils/helpers';

export default function TicketScreen({ route, navigation }) {
  const { reference } = route.params;
  const { getBookingByReference, isLoading } = useBookings();
  const [booking, setBooking] = useState(null);

  useEffect(() => {
    loadBooking();
  }, []);

  const loadBooking = async () => {
    const result = await getBookingByReference(reference);
    if (result.success) {
      setBooking(result.booking);
    }
  };

  const handleShare = async () => {
    try {
      await Share.share({
        message: `Your ticket ${booking.booking_reference} for ${booking.origin} → ${booking.destination} on ${formatDateTime(booking.departure_time)}`,
      });
    } catch (error) {
      console.error(error);
    }
  };

  if (isLoading || !booking) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Card style={styles.ticketCard}>
        <Card.Content>
          <View style={styles.header}>
            <Text variant="titleLarge">Seti Himalayan</Text>
            <Text variant="bodySmall">Tours & Travels</Text>
          </View>
          <View style={styles.qrContainer}>
            <QRCode value={booking.booking_reference} size={120} />
          </View>
          <Text variant="headlineSmall" style={styles.ref}>{booking.booking_reference}</Text>
          <View style={styles.divider} />
          <View style={styles.row}>
            <Text variant="bodyMedium">From:</Text>
            <Text variant="bodyMedium" style={styles.value}>{booking.origin}</Text>
          </View>
          <View style={styles.row}>
            <Text variant="bodyMedium">To:</Text>
            <Text variant="bodyMedium" style={styles.value}>{booking.destination}</Text>
          </View>
          <View style={styles.row}>
            <Text variant="bodyMedium">Date:</Text>
            <Text variant="bodyMedium" style={styles.value}>{formatDateTime(booking.departure_time)}</Text>
          </View>
          <View style={styles.row}>
            <Text variant="bodyMedium">Bus:</Text>
            <Text variant="bodyMedium" style={styles.value}>{booking.bus_number}</Text>
          </View>
          <View style={styles.row}>
            <Text variant="bodyMedium">Seats:</Text>
            <Text variant="bodyMedium" style={styles.value}>{booking.selected_seats?.join(', ')}</Text>
          </View>
          <View style={styles.row}>
            <Text variant="bodyMedium">Passenger:</Text>
            <Text variant="bodyMedium" style={styles.value}>{booking.passenger_details?.name}</Text>
          </View>
          <View style={styles.row}>
            <Text variant="bodyMedium">Amount:</Text>
            <Text variant="bodyMedium" style={styles.value}>{formatCurrency(booking.total_amount)}</Text>
          </View>
          <View style={styles.divider} />
          <Text variant="bodySmall" style={styles.footer}>Please carry a valid ID proof</Text>
        </Card.Content>
      </Card>
      <Button mode="contained" onPress={handleShare} style={styles.shareButton}>
        Share Ticket
      </Button>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background, padding: 16 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  ticketCard: { elevation: 4, backgroundColor: colors.surface },
  header: { alignItems: 'center', marginBottom: 16 },
  qrContainer: { alignItems: 'center', marginVertical: 16 },
  ref: { textAlign: 'center', fontWeight: 'bold', marginBottom: 16 },
  divider: { height: 1, backgroundColor: colors.border, marginVertical: 12 },
  row: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  value: { fontWeight: '500' },
  footer: { textAlign: 'center', marginTop: 12, color: colors.textSecondary },
  shareButton: { marginTop: 16, backgroundColor: colors.primary },
});