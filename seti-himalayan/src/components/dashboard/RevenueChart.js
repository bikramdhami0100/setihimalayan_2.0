import React from 'react';
import { View, StyleSheet, Dimensions } from 'react-native';
import { Text } from 'react-native-paper';
import { colors } from '../../utils/colors';

// Simple placeholder – in production use Victory or react-native-chart-kit
export default function RevenueChart() {
  return (
    <View style={styles.container}>
      <Text variant="titleMedium">Revenue Trend (Last 7 Days)</Text>
      <View style={styles.placeholder}>
        <Text>Chart Placeholder – Integrate Victory Native</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { marginTop: 16 },
  placeholder: { height: 200, backgroundColor: '#E2E8F0', borderRadius: 8, justifyContent: 'center', alignItems: 'center', marginTop: 8 },
});