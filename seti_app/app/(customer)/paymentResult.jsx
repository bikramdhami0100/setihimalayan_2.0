// app/payment/result.js (or similar)
import { useEffect } from 'react';
import { View, Text, ActivityIndicator } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';

export default function PaymentResultScreen() {
  const { status, payment_transaction_id, booking_id, message } = useLocalSearchParams();

  useEffect(() => {
    if (status === 'success') {
      // Navigate to booking confirmation after a short delay
      setTimeout(() => {
        router.replace(`/booking/${booking_id}/confirmation`);
      }, 2000);
    } else {
      setTimeout(() => {
        router.back();
      }, 2000);
    }
  }, [status]);

  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 }}>
      {status === 'success' ? (
        <>
          <Text style={{ fontSize: 24, color: 'green' }}>✅ Payment Successful!</Text>
          <Text style={{ marginTop: 10 }}>Redirecting to your booking...</Text>
        </>
      ) : (
        <>
          <Text style={{ fontSize: 24, color: 'red' }}>❌ Payment Failed</Text>
          <Text style={{ marginTop: 10 }}>{message || 'Please try again.'}</Text>
          <Text style={{ marginTop: 10 }}>Redirecting back...</Text>
        </>
      )}
      <ActivityIndicator style={{ marginTop: 20 }} />
    </View>
  );
}