import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Text, Icon } from 'react-native-paper';
import { colors } from '../../utils/colors';

export default function EmptyState({ icon = 'information', message = 'No data found', actionText, onAction }) {
  return (
    <View style={styles.container}>
      <Icon source={icon} size={64} color={colors.disabled} />
      <Text variant="titleMedium" style={styles.message}>{message}</Text>
      {actionText && onAction && (
        <Text variant="bodyMedium" style={styles.action} onPress={onAction}>
          {actionText}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 40 },
  message: { marginTop: 16, color: colors.textSecondary, textAlign: 'center' },
  action: { marginTop: 12, color: colors.primary, fontWeight: '500' },
});