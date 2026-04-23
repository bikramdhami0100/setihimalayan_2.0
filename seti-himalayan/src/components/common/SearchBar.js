import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Searchbar } from 'react-native-paper';
import { colors } from '../../utils/colors';

export default function SearchBar({ value, onChange, placeholder = 'Search...', onClear }) {
  return (
    <View style={styles.container}>
      <Searchbar
        placeholder={placeholder}
        onChangeText={onChange}
        value={value}
        onClearIconPress={onClear}
        style={styles.searchbar}
        inputStyle={styles.input}
        iconColor={colors.primary}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { paddingHorizontal: 16, paddingVertical: 8, backgroundColor: colors.background },
  searchbar: { elevation: 2, borderRadius: 8, backgroundColor: colors.surface },
  input: { fontSize: 16 },
});