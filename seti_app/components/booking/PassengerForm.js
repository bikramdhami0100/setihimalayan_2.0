import React, { useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { Text, TextInput, Button } from 'react-native-paper';
import { colors } from '../../utils/colors';

export default function PassengerForm({ onSubmit, initialData, isLoading }) {
  const [formData, setFormData] = useState(initialData || { name: '', age: '', gender: 'M', email: '', phone: '' });

  const handleSubmit = () => {
    if (!formData.name) {
      alert('Please enter passenger name');
      return;
    }
    onSubmit(formData);
  };

  return (
    <View style={styles.container}>
      <Text variant="titleMedium" style={styles.title}>Passenger Details</Text>
      <TextInput
        mode="outlined"
        label="Full Name *"
        value={formData.name}
        onChangeText={(text) => setFormData({ ...formData, name: text })}
        style={styles.input}
      />
      <TextInput
        mode="outlined"
        label="Age"
        value={formData.age}
        onChangeText={(text) => setFormData({ ...formData, age: text })}
        keyboardType="numeric"
        style={styles.input}
      />
      <TextInput
        mode="outlined"
        label="Gender (M/F/Other)"
        value={formData.gender}
        onChangeText={(text) => setFormData({ ...formData, gender: text })}
        style={styles.input}
      />
      <TextInput
        mode="outlined"
        label="Email (for ticket)"
        value={formData.email}
        onChangeText={(text) => setFormData({ ...formData, email: text })}
        keyboardType="email-address"
        style={styles.input}
      />
      <TextInput
        mode="outlined"
        label="Phone"
        value={formData.phone}
        onChangeText={(text) => setFormData({ ...formData, phone: text })}
        keyboardType="phone-pad"
        style={styles.input}
      />
      <Button mode="contained" onPress={handleSubmit} loading={isLoading} style={styles.button}>
        Continue
      </Button>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16 },
  title: { marginBottom: 12, color: colors.text },
  input: { marginBottom: 12, backgroundColor: colors.surface },
  button: { marginTop: 8, backgroundColor: colors.primary },
});