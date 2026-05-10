import React from "react";
import { View, Text, SafeAreaView, StyleSheet } from "react-native";

export default function BookingDetail() {
  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.title}>Booking Details</Text>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    padding: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1E3A8A',
    marginBottom: 16,
  },
});
