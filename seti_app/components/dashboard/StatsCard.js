import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Card, Text, Icon } from 'react-native-paper';
import { colors } from '../../utils/colors';

export default function StatsCard({ title, value, icon, color }) {
  return (
    <Card style={styles.card}>
      <Card.Content style={styles.content}>
        <View style={[styles.iconContainer, { backgroundColor: color + '20' }]}>
          <Icon source={icon} size={24} color={color} />
        </View>
        <Text variant="titleLarge" style={styles.value}>{value}</Text>
        <Text variant="bodySmall" style={styles.title}>{title}</Text>
      </Card.Content>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { width: '48%', marginBottom: 12, elevation: 2 },
  content: { alignItems: 'center', paddingVertical: 12 },
  iconContainer: { padding: 8, borderRadius: 30, marginBottom: 8 },
  value: { fontWeight: 'bold', color: colors.text },
  title: { color: colors.textSecondary },
});