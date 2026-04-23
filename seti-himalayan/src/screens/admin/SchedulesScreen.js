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
import { Text, Card, Button, FAB, TextInput, IconButton, ActivityIndicator, Chip } from 'react-native-paper';
import { getSchedules, createSchedule, updateSchedule, cancelSchedule } from '../../api/schedules';
import { getBuses } from '../../api/buses';
import { getRoutes } from '../../api/routes';
import useUIStore from '../../store/uiStore';
import { colors } from '../../utils/colors';
import { formatDateTime } from '../../utils/helpers';

export default function SchedulesScreen() {
  const [schedules, setSchedules] = useState([]);
  const [buses, setBuses] = useState([]);
  const [routes, setRoutes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingSchedule, setEditingSchedule] = useState(null);
  const [formData, setFormData] = useState({
    bus_id: '',
    route_id: '',
    departure_time: '',
    arrival_time: '',
    base_price: '',
    driver_name: '',
    driver_phone: '',
    conductor_name: '',
    conductor_phone: '',
  });
  const { showSnackbar } = useUIStore();

  const fetchData = async () => {
    try {
      const [schedulesRes, busesRes, routesRes] = await Promise.all([
        getSchedules(),
        getBuses(),
        getRoutes(),
      ]);
      setSchedules(schedulesRes.data.data.schedules);
      setBuses(busesRes.data.data.buses);
      setRoutes(routesRes.data.data.routes);
    } catch (error) {
      showSnackbar(error.response?.data?.message || 'Failed to load data', 'error');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    fetchData();
  };

  const handleSave = async () => {
    if (!formData.bus_id || !formData.route_id || !formData.departure_time || !formData.arrival_time || !formData.base_price) {
      showSnackbar('Please fill all required fields', 'warning');
      return;
    }
    try {
      if (editingSchedule) {
        await updateSchedule(editingSchedule.id, formData);
        showSnackbar('Schedule updated', 'success');
      } else {
        await createSchedule(formData);
        showSnackbar('Schedule created', 'success');
      }
      setModalVisible(false);
      resetForm();
      fetchData();
    } catch (error) {
      showSnackbar(error.response?.data?.message || 'Operation failed', 'error');
    }
  };

  const handleCancel = (schedule) => {
    Alert.alert('Cancel Schedule', `Cancel schedule on ${formatDateTime(schedule.departure_time)}?`, [
      { text: 'No', style: 'cancel' },
      {
        text: 'Yes, Cancel',
        style: 'destructive',
        onPress: async () => {
          try {
            await cancelSchedule(schedule.id, 'Cancelled by admin');
            showSnackbar('Schedule cancelled', 'success');
            fetchData();
          } catch (error) {
            showSnackbar(error.response?.data?.message || 'Cancel failed', 'error');
          }
        },
      },
    ]);
  };

  const resetForm = () => {
    setEditingSchedule(null);
    setFormData({
      bus_id: '',
      route_id: '',
      departure_time: '',
      arrival_time: '',
      base_price: '',
      driver_name: '',
      driver_phone: '',
      conductor_name: '',
      conductor_phone: '',
    });
  };

  const openEditModal = (schedule) => {
    setEditingSchedule(schedule);
    setFormData({
      bus_id: schedule.bus_id.toString(),
      route_id: schedule.route_id.toString(),
      departure_time: schedule.departure_time.slice(0, 16),
      arrival_time: schedule.arrival_time.slice(0, 16),
      base_price: schedule.base_price.toString(),
      driver_name: schedule.driver_name || '',
      driver_phone: schedule.driver_phone || '',
      conductor_name: schedule.conductor_name || '',
      conductor_phone: schedule.conductor_phone || '',
    });
    setModalVisible(true);
  };

  const getBusNumber = (busId) => {
    const bus = buses.find(b => b.id === busId);
    return bus ? bus.bus_number : 'N/A';
  };

  const getRouteName = (routeId) => {
    const route = routes.find(r => r.id === routeId);
    return route ? `${route.origin} → ${route.destination}` : 'N/A';
  };

  const renderScheduleCard = ({ item }) => (
    <Card style={styles.card}>
      <Card.Content>
        <View style={styles.cardHeader}>
          <Text variant="titleMedium">{getRouteName(item.route_id)}</Text>
          <Chip mode="outlined" style={item.status === 'scheduled' ? styles.chipScheduled : styles.chipCancelled}>
            {item.status}
          </Chip>
        </View>
        <Text variant="bodyMedium">Bus: {getBusNumber(item.bus_id)}</Text>
        <Text variant="bodySmall">Departure: {formatDateTime(item.departure_time)}</Text>
        <Text variant="bodySmall">Arrival: {formatDateTime(item.arrival_time)}</Text>
        <Text variant="bodySmall">Price: NPR {item.base_price}</Text>
        <Text variant="bodySmall">Seats: {item.available_seats}/{item.total_seats} available</Text>
        <View style={styles.cardActions}>
          <IconButton icon="pencil" size={20} onPress={() => openEditModal(item)} />
          {item.status === 'scheduled' && (
            <IconButton icon="cancel" size={20} onPress={() => handleCancel(item)} />
          )}
        </View>
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
        data={schedules}
        keyExtractor={(item) => item.id.toString()}
        renderItem={renderScheduleCard}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        contentContainerStyle={styles.list}
        ListEmptyComponent={<Text style={styles.emptyText}>No schedules found</Text>}
      />
      <FAB style={styles.fab} icon="plus" onPress={() => { resetForm(); setModalVisible(true); }} />

      <Modal visible={modalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <ScrollView>
              <Text variant="titleLarge" style={styles.modalTitle}>
                {editingSchedule ? 'Edit Schedule' : 'Add Schedule'}
              </Text>
              <TextInput
                mode="outlined"
                label="Bus ID"
                value={formData.bus_id}
                onChangeText={(text) => setFormData({ ...formData, bus_id: text })}
                keyboardType="numeric"
                style={styles.modalInput}
              />
              <TextInput
                mode="outlined"
                label="Route ID"
                value={formData.route_id}
                onChangeText={(text) => setFormData({ ...formData, route_id: text })}
                keyboardType="numeric"
                style={styles.modalInput}
              />
              <TextInput
                mode="outlined"
                label="Departure Time (YYYY-MM-DD HH:MM)"
                value={formData.departure_time}
                onChangeText={(text) => setFormData({ ...formData, departure_time: text })}
                style={styles.modalInput}
              />
              <TextInput
                mode="outlined"
                label="Arrival Time (YYYY-MM-DD HH:MM)"
                value={formData.arrival_time}
                onChangeText={(text) => setFormData({ ...formData, arrival_time: text })}
                style={styles.modalInput}
              />
              <TextInput
                mode="outlined"
                label="Base Price (NPR)"
                value={formData.base_price}
                onChangeText={(text) => setFormData({ ...formData, base_price: text })}
                keyboardType="numeric"
                style={styles.modalInput}
              />
              <TextInput
                mode="outlined"
                label="Driver Name"
                value={formData.driver_name}
                onChangeText={(text) => setFormData({ ...formData, driver_name: text })}
                style={styles.modalInput}
              />
              <TextInput
                mode="outlined"
                label="Driver Phone"
                value={formData.driver_phone}
                onChangeText={(text) => setFormData({ ...formData, driver_phone: text })}
                keyboardType="phone-pad"
                style={styles.modalInput}
              />
              <TextInput
                mode="outlined"
                label="Conductor Name"
                value={formData.conductor_name}
                onChangeText={(text) => setFormData({ ...formData, conductor_name: text })}
                style={styles.modalInput}
              />
              <TextInput
                mode="outlined"
                label="Conductor Phone"
                value={formData.conductor_phone}
                onChangeText={(text) => setFormData({ ...formData, conductor_phone: text })}
                keyboardType="phone-pad"
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
  chipScheduled: { borderColor: colors.success, color: colors.success },
  chipCancelled: { borderColor: colors.error, color: colors.error },
  cardActions: { flexDirection: 'row', justifyContent: 'flex-end', marginTop: 8 },
  emptyText: { textAlign: 'center', marginTop: 40, color: colors.textSecondary },
  fab: { position: 'absolute', right: 16, bottom: 16, backgroundColor: colors.primary },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 20 },
  modalContent: { backgroundColor: colors.surface, borderRadius: 12, padding: 20, maxHeight: '80%' },
  modalTitle: { marginBottom: 16, textAlign: 'center' },
  modalInput: { marginBottom: 12 },
  modalButtons: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 16 },
  modalButton: { flex: 1, marginHorizontal: 8 },
});