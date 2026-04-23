import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, Alert } from 'react-native';
import { Text, TextInput, Button, Card, ActivityIndicator } from 'react-native-paper';
import { useBookingStore } from '../../store/bookingStore';
import { usePayment } from '../../hooks/usePayment';
import { colors } from '../../utils/colors';
import { formatCurrency, formatDateTime } from '../../utils/helpers';

export default function BookingConfirmationScreen({ route, navigation }) {
  const { schedule, selectedSeats, origin, destination, date } = route.params;
  const { initiateBooking, currentBooking, setPassengerDetails, passengerDetails } = useBookingStore();
  const { initiate: initiatePayment, isProcessing } = usePayment();
  const [formData, setFormData] = useState({
    name: passengerDetails?.name || '',
    age: passengerDetails?.age || '',
    gender: passengerDetails?.gender || 'M',
    email: '',
    phone: '',
  });
  const [specialRequests, setSpecialRequests] = useState('');
  const [loading, setLoading] = useState(false);

  const totalAmount = selectedSeats.length * schedule.base_price;

  const handleConfirm = async () => {
    if (!formData.name) {
      Alert.alert('Error', 'Please enter passenger name');
      return;
    }
    setLoading(true);
    const result = await initiateBooking(schedule.id, selectedSeats, formData, specialRequests);
    if (result.success) {
      setPassengerDetails(formData);
      // Proceed to payment
      const paymentResult = await initiatePayment(result.booking.id, 'esewa'); // default gateway
      if (paymentResult.success && paymentResult.payment_url) {
        navigation.navigate('WebViewPayment', { url: paymentResult.payment_url, bookingId: result.booking.id });
      } else {
        Alert.alert('Payment Error', paymentResult.message || 'Failed to initiate payment');
      }
    } else {
      Alert.alert('Booking Error', result.message);
    }
    setLoading(false);
  };

  return (
    <ScrollView style={styles.container}>
      <Card style={styles.card}>
        <Card.Content>
          <Text variant="titleMedium">Journey Details</Text>
          <Text>{origin} → {destination}</Text>
          <Text>Departure: {formatDateTime(schedule.departure_time)}</Text>
          <Text>Bus: {schedule.bus_number} ({schedule.bus_type})</Text>
        </Card.Content>
      </Card>

      <Card style={styles.card}>
        <Card.Content>
          <Text variant="titleMedium">Selected Seats</Text>
          <Text>{selectedSeats.join(', ')}</Text>
        </Card.Content>
      </Card>

      <Card style={styles.card}>
        <Card.Content>
          <Text variant="titleMedium">Passenger Details</Text>
          <TextInput
            mode="outlined"
            label="Full Name *"
            value={formData.name}
            onChangeText={(text) => setFormData({ ...formData, name: text })}
            style={styles.input}
          />
          <TextInput
            mode="outlined"
            label="Age"
            value={formData.age}
            onChangeText={(text) => setFormData({ ...formData, age: text })}
            keyboardType="numeric"
            style={styles.input}
          />
          <TextInput
            mode="outlined"
            label="Gender (M/F/Other)"
            value={formData.gender}
            onChangeText={(text) => setFormData({ ...formData, gender: text })}
            style={styles.input}
          />
          <TextInput
            mode="outlined"
            label="Email (for ticket)"
            value={formData.email}
            onChangeText={(text) => setFormData({ ...formData, email: text })}
            keyboardType="email-address"
            style={styles.input}
          />
          <TextInput
            mode="outlined"
            label="Phone"
            value={formData.phone}
            onChangeText={(text) => setFormData({ ...formData, phone: text })}
            keyboardType="phone-pad"
            style={styles.input}
          />
        </Card.Content>
      </Card>

      <Card style={styles.card}>
        <Card.Content>
          <Text variant="titleMedium">Special Requests</Text>
          <TextInput
            mode="outlined"
            multiline
            numberOfLines={3}
            value={specialRequests}
            onChangeText={setSpecialRequests}
            style={styles.input}
          />
        </Card.Content>
      </Card>

      <Card style={styles.card}>
        <Card.Content>
          <Text variant="titleMedium">Payment Summary</Text>
          <View style={styles.summaryRow}>
            <Text>Ticket Price:</Text>
            <Text>{formatCurrency(schedule.base_price)} x {selectedSeats.length}</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text variant="titleSmall">Total Amount:</Text>
            <Text variant="titleSmall" style={styles.total}>{formatCurrency(totalAmount)}</Text>
          </View>
        </Card.Content>
      </Card>

      <Button
        mode="contained"
        onPress={handleConfirm}
        loading={loading || isProcessing}
        disabled={loading || isProcessing}
        style={styles.confirmButton}
        buttonColor={colors.primary}
      >
        Confirm & Pay
      </Button>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background, padding: 16 },
  card: { marginBottom: 16, elevation: 2 },
  input: { marginTop: 8, backgroundColor: colors.surface },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 8 },
  total: { fontWeight: 'bold', color: colors.primary },
  confirmButton: { marginVertical: 16, paddingVertical: 6 },
});