import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Text, Button } from 'react-native-paper';
import { colors } from '../../utils/colors';

export default function NotFoundScreen({ navigation }) {
  return (
    <View style={styles.container}>
      <Text variant="headlineLarge" style={styles.code}>404</Text>
      <Text variant="titleLarge" style={styles.title}>Page Not Found</Text>
      <Text variant="bodyMedium" style={styles.message}>
        The screen you're looking for doesn't exist or has been moved.
      </Text>
      <Button mode="contained" onPress={() => navigation.navigate('Home')} style={styles.button}>
        Go to Home
      </Button>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background, padding: 20 },
  code: { fontSize: 72, fontWeight: 'bold', color: colors.primary, marginBottom: 16 },
  title: { color: colors.text, marginBottom: 8 },
  message: { textAlign: 'center', color: colors.textSecondary, marginBottom: 24 },
  button: { backgroundColor: colors.primary },
});