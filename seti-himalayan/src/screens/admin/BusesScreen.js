import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  FlatList,
  RefreshControl,
  Alert,
  Modal,
  ScrollView,
} from 'react-native';
import { Text, Card, Button, FAB, TextInput, IconButton, ActivityIndicator } from 'react-native-paper';
import { getBuses, createBus, updateBus, deleteBus } from '../../api/buses';
import useUIStore from '../../store/uiStore';
import { colors } from '../../utils/colors';

export default function BusesScreen() {
  const [buses, setBuses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingBus, setEditingBus] = useState(null);
  const [formData, setFormData] = useState({
    bus_number: '',
    registration_number: '',
    total_seats: '',
    bus_type: 'Standard',
    manufacturer: '',
    model: '',
    year: '',
    status: 'active',
  });
  const { showSnackbar } = useUIStore();

  const fetchBuses = async () => {
    try {
      const response = await getBuses();
      setBuses(response.data.data.buses);
    } catch (error) {
      showSnackbar(error.response?.data?.message || 'Failed to load buses', 'error');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchBuses();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    fetchBuses();
  };

  const handleSave = async () => {
    if (!formData.bus_number || !formData.total_seats) {
      showSnackbar('Bus number and total seats are required', 'warning');
      return;
    }
    try {
      if (editingBus) {
        await updateBus(editingBus.id, formData);
        showSnackbar('Bus updated successfully', 'success');
      } else {
        await createBus(formData);
        showSnackbar('Bus created successfully', 'success');
      }
      setModalVisible(false);
      resetForm();
      fetchBuses();
    } catch (error) {
      showSnackbar(error.response?.data?.message || 'Operation failed', 'error');
    }
  };

  const handleDelete = (bus) => {
    Alert.alert('Delete Bus', `Are you sure you want to delete bus ${bus.bus_number}?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteBus(bus.id);
            showSnackbar('Bus deleted', 'success');
            fetchBuses();
          } catch (error) {
            showSnackbar(error.response?.data?.message || 'Delete failed', 'error');
          }
        },
      },
    ]);
  };

  const resetForm = () => {
    setEditingBus(null);
    setFormData({
      bus_number: '',
      registration_number: '',
      total_seats: '',
      bus_type: 'Standard',
      manufacturer: '',
      model: '',
      year: '',
      status: 'active',
    });
  };

  const openEditModal = (bus) => {
    setEditingBus(bus);
    setFormData({
      bus_number: bus.bus_number,
      registration_number: bus.registration_number || '',
      total_seats: bus.total_seats.toString(),
      bus_type: bus.bus_type,
      manufacturer: bus.manufacturer || '',
      model: bus.model || '',
      year: bus.year ? bus.year.toString() : '',
      status: bus.status,
    });
    setModalVisible(true);
  };

  const renderBusCard = ({ item }) => (
    <Card style={styles.card}>
      <Card.Content>
        <View style={styles.cardHeader}>
          <Text variant="titleLarge">{item.bus_number}</Text>
          <View style={styles.cardActions}>
            <IconButton icon="pencil" size={20} onPress={() => openEditModal(item)} />
            <IconButton icon="delete" size={20} onPress={() => handleDelete(item)} />
          </View>
        </View>
        <Text variant="bodyMedium">Type: {item.bus_type}</Text>
        <Text variant="bodyMedium">Seats: {item.total_seats}</Text>
        <Text variant="bodyMedium">Status: {item.status}</Text>
        {item.manufacturer && <Text variant="bodySmall">Manufacturer: {item.manufacturer}</Text>}
      </Card.Content>
    </Card>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={buses}
        keyExtractor={(item) => item.id.toString()}
        renderItem={renderBusCard}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        contentContainerStyle={styles.list}
        ListEmptyComponent={<Text style={styles.emptyText}>No buses found</Text>}
      />
      <FAB style={styles.fab} icon="plus" onPress={() => { resetForm(); setModalVisible(true); }} />

      <Modal visible={modalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <ScrollView>
              <Text variant="titleLarge" style={styles.modalTitle}>
                {editingBus ? 'Edit Bus' : 'Add Bus'}
              </Text>
              <TextInput
                mode="outlined"
                label="Bus Number *"
                value={formData.bus_number}
                onChangeText={(text) => setFormData({ ...formData, bus_number: text })}
                style={styles.modalInput}
              />
              <TextInput
                mode="outlined"
                label="Registration Number"
                value={formData.registration_number}
                onChangeText={(text) => setFormData({ ...formData, registration_number: text })}
                style={styles.modalInput}
              />
              <TextInput
                mode="outlined"
                label="Total Seats *"
                value={formData.total_seats}
                onChangeText={(text) => setFormData({ ...formData, total_seats: text })}
                keyboardType="numeric"
                style={styles.modalInput}
              />
              <TextInput
                mode="outlined"
                label="Bus Type"
                value={formData.bus_type}
                onChangeText={(text) => setFormData({ ...formData, bus_type: text })}
                style={styles.modalInput}
              />
              <TextInput
                mode="outlined"
                label="Manufacturer"
                value={formData.manufacturer}
                onChangeText={(text) => setFormData({ ...formData, manufacturer: text })}
                style={styles.modalInput}
              />
              <TextInput
                mode="outlined"
                label="Model"
                value={formData.model}
                onChangeText={(text) => setFormData({ ...formData, model: text })}
                style={styles.modalInput}
              />
              <TextInput
                mode="outlined"
                label="Year"
                value={formData.year}
                onChangeText={(text) => setFormData({ ...formData, year: text })}
                keyboardType="numeric"
                style={styles.modalInput}
              />
              <View style={styles.modalButtons}>
                <Button mode="outlined" onPress={() => setModalVisible(false)} style={styles.modalButton}>
                  Cancel
                </Button>
                <Button mode="contained" onPress={handleSave} style={styles.modalButton}>
                  Save
                </Button>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  list: { padding: 16 },
  card: { marginBottom: 12, elevation: 2 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  cardActions: { flexDirection: 'row' },
  emptyText: { textAlign: 'center', marginTop: 40, color: colors.textSecondary },
  fab: { position: 'absolute', right: 16, bottom: 16, backgroundColor: colors.primary },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 20 },
  modalContent: { backgroundColor: colors.surface, borderRadius: 12, padding: 20, maxHeight: '80%' },
  modalTitle: { marginBottom: 16, textAlign: 'center' },
  modalInput: { marginBottom: 12 },
  modalButtons: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 16 },
  modalButton: { flex: 1, marginHorizontal: 8 },
});