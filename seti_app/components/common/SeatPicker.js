import React from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { Text } from 'react-native-paper';
import { colors } from '../../utils/colors';
import { getSeatColor } from '../../utils/helpers';

export default function SeatPicker({ seatNumber, status, onPress, disabled }) {
  const backgroundColor = getSeatColor(status);
  return (
    <TouchableOpacity
      style={[styles.seat, { backgroundColor }]}
      onPress={() => onPress(seatNumber)}
      disabled={disabled || status !== 'available'}
    >
      <Text style={styles.seatText}>{seatNumber}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  seat: { width: 50, height: 50, margin: 4, borderRadius: 8, justifyContent: 'center', alignItems: 'center' },
  seatText: { color: '#fff', fontWeight: 'bold' },
});