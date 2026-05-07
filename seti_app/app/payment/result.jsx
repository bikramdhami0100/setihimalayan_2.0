import React, { useEffect, useState } from 'react';
import { View, Text, ActivityIndicator, SafeAreaView, TouchableOpacity } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { getBookingById } from '../../api/bookings';

export default function PaymentResultScreen() {
  const { status, booking_id, payment_transaction_id, message } = useLocalSearchParams();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const handleResult = async () => {
      console.log("Params:", { status, booking_id });
      
      if (status === 'success' && booking_id) {
        try {
          const response = await getBookingById(booking_id);
          console.log("API Response:", JSON.stringify(response.data, null, 2));
          
          // ✅ FIX: Extract the booking object from the nested structure
          const bookingData = response.data?.data?.booking || response.data?.data;
          console.log("Booking object:", bookingData);
          console.log("Booking reference:", bookingData?.booking_reference);
          
          if (bookingData && bookingData.booking_reference) {
            const targetRoute = `/(customer)/booking-confirmation?bookingReference=${bookingData.booking_reference}`;
            console.log("Navigating to:", targetRoute);
            router.replace(targetRoute);
          } else {
            setError('Booking reference not found in response');
          }
        } catch (err) {
          console.error('Failed to fetch booking:', err);
          setError(`Unable to retrieve booking: ${err.message}`);
        } finally {
          setLoading(false);
        }
      } else if (status === 'failed') {
        setTimeout(() => router.back(), 3000);
        setLoading(false);
      } else {
        setLoading(false);
      }
    };

    handleResult();
  }, [status, booking_id]);

  if (loading) {
    return (
      <SafeAreaView style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#0f172a" />
        <Text style={{ marginTop: 20 }}>Confirming your booking...</Text>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 }}>
        <Text style={{ fontSize: 18, color: 'red', textAlign: 'center', marginBottom: 20 }}>⚠️ {error}</Text>
        <TouchableOpacity 
          onPress={() => router.replace('/(customer)/')}
          style={{ backgroundColor: '#0f172a', paddingHorizontal: 20, paddingVertical: 12, borderRadius: 12 }}
        >
          <Text style={{ color: 'white', fontWeight: 'bold' }}>Go to Home</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 }}>
      {status === 'success' ? (
        <>
          <Text style={{ fontSize: 24, color: 'green' }}>✅ Payment Successful!</Text>
          <Text style={{ marginTop: 10 }}>Redirecting to your ticket...</Text>
        </>
      ) : (
        <>
          <Text style={{ fontSize: 24, color: 'red' }}>❌ Payment Failed</Text>
          <Text style={{ marginTop: 10 }}>{message || 'Please try again.'}</Text>
          <Text style={{ marginTop: 10 }}>Returning...</Text>
        </>
      )}
      <ActivityIndicator style={{ marginTop: 20 }} />
    </SafeAreaView>
  );
}