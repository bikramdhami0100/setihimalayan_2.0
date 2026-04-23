import React from 'react';
import { TextInput, StyleSheet } from 'react-native';
import { colors } from '../../utils/colors';

export default function Input({ label, value, onChangeText, placeholder, secureTextEntry, keyboardType, error, style, ...props }) {
  return (
    <TextInput
      style={[styles.input, error && styles.inputError, style]}
      placeholder={placeholder || label}
      value={value}
      onChangeText={onChangeText}
      secureTextEntry={secureTextEntry}
      keyboardType={keyboardType}
      placeholderTextColor={colors.placeholder}
      {...props}
    />
  );
}

const styles = StyleSheet.create({
  input: { borderWidth: 1, borderColor: colors.border, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10, fontSize: 16, backgroundColor: colors.surface, color: colors.text },
  inputError: { borderColor: colors.error },
});