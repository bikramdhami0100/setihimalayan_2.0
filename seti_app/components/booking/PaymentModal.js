import React, { useState } from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { Text, Button, RadioButton, Portal, Modal } from 'react-native-paper';
import { colors } from '../../utils/colors';

export default function PaymentModal({ visible, onClose, onSelect, amount, isLoading }) {
  const [selectedGateway, setSelectedGateway] = useState('esewa');

  const gateways = [
    { id: 'esewa', name: 'eSewa', icon: 'wallet' },
    { id: 'khalti', name: 'Khalti', icon: 'cash' },
    { id: 'connectips', name: 'ConnectIPS', icon: 'bank' },
  ];

  const handleConfirm = () => {
    onSelect(selectedGateway);
  };

  return (
    <Portal>
      <Modal visible={visible} onDismiss={onClose} contentContainerStyle={styles.modal}>
        <Text variant="titleLarge" style={styles.title}>Select Payment Method</Text>
        <Text variant="bodyLarge" style={styles.amount}>Amount: NPR {amount}</Text>
        <RadioButton.Group onValueChange={setSelectedGateway} value={selectedGateway}>
          {gateways.map((gateway) => (
            <TouchableOpacity key={gateway.id} style={styles.gatewayItem} onPress={() => setSelectedGateway(gateway.id)}>
              <RadioButton value={gateway.id} />
              <Text style={styles.gatewayText}>{gateway.name}</Text>
            </TouchableOpacity>
          ))}
        </RadioButton.Group>
        <View style={styles.buttons}>
          <Button mode="outlined" onPress={onClose} style={styles.button}>Cancel</Button>
          <Button mode="contained" onPress={handleConfirm} loading={isLoading} style={styles.button}>Pay Now</Button>
        </View>
      </Modal>
    </Portal>
  );
}

const styles = StyleSheet.create({
  modal: { backgroundColor: colors.surface, borderRadius: 12, padding: 20, width: '80%', alignSelf: 'center' },
  title: { textAlign: 'center', marginBottom: 8 },
  amount: { textAlign: 'center', marginBottom: 16, color: colors.primary },
  gatewayItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8 },
  gatewayText: { marginLeft: 8, fontSize: 16 },
  buttons: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 20 },
  button: { flex: 1, marginHorizontal: 8 },
});