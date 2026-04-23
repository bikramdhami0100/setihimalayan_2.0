import React from 'react';
import { TouchableOpacity, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { colors } from '../../utils/colors';

export default function Button({ title, onPress, loading, disabled, type = 'primary', style }) {
  const getBackgroundColor = () => {
    if (disabled) return colors.disabled;
    if (type === 'primary') return colors.primary;
    if (type === 'secondary') return colors.secondary;
    if (type === 'danger') return colors.error;
    return colors.primary;
  };

  return (
    <TouchableOpacity
      style={[styles.button, { backgroundColor: getBackgroundColor() }, style]}
      onPress={onPress}
      disabled={disabled || loading}
      activeOpacity={0.8}
    >
      {loading ? (
        <ActivityIndicator size="small" color="#fff" />
      ) : (
        <Text style={styles.text}>{title}</Text>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: { paddingVertical: 12, paddingHorizontal: 24, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  text: { color: '#fff', fontSize: 16, fontWeight: '600' },
});