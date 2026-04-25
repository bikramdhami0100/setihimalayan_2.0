import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Text } from 'react-native-paper';
import { colors } from '../../utils/colors';

export default function PopularRoutesChart() {
  return (
    <View style={styles.container}>
      <Text variant="titleMedium">Popular Routes</Text>
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