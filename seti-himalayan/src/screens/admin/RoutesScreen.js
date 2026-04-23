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
import { getRoutes, createRoute, updateRoute, deleteRoute } from '../../api/routes';
import useUIStore from '../../store/uiStore';
import { colors } from '../../utils/colors';

export default function RoutesScreen() {
  const [routes, setRoutes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingRoute, setEditingRoute] = useState(null);
  const [formData, setFormData] = useState({
    origin: '',
    destination: '',
    distance_km: '',
    duration_minutes: '',
    base_price: '',
    description: '',
  });
  const { showSnackbar } = useUIStore();

  const fetchRoutes = async () => {
    try {
      const response = await getRoutes();
      setRoutes(response.data.data.routes);
    } catch (error) {
      showSnackbar(error.response?.data?.message || 'Failed to load routes', 'error');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchRoutes();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    fetchRoutes();
  };

  const handleSave = async () => {
    if (!formData.origin || !formData.destination || !formData.base_price) {
      showSnackbar('Origin, destination and base price are required', 'warning');
      return;
    }
    try {
      if (editingRoute) {
        await updateRoute(editingRoute.id, formData);
        showSnackbar('Route updated successfully', 'success');
      } else {
        await createRoute(formData);
        showSnackbar('Route created successfully', 'success');
      }
      setModalVisible(false);
      resetForm();
      fetchRoutes();
    } catch (error) {
      showSnackbar(error.response?.data?.message || 'Operation failed', 'error');
    }
  };

  const handleDelete = (route) => {
    Alert.alert('Delete Route', `Delete route ${route.origin} → ${route.destination}?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteRoute(route.id);
            showSnackbar('Route deleted', 'success');
            fetchRoutes();
          } catch (error) {
            showSnackbar(error.response?.data?.message || 'Delete failed', 'error');
          }
        },
      },
    ]);
  };

  const resetForm = () => {
    setEditingRoute(null);
    setFormData({
      origin: '',
      destination: '',
      distance_km: '',
      duration_minutes: '',
      base_price: '',
      description: '',
    });
  };

  const openEditModal = (route) => {
    setEditingRoute(route);
    setFormData({
      origin: route.origin,
      destination: route.destination,
      distance_km: route.distance_km ? route.distance_km.toString() : '',
      duration_minutes: route.duration_minutes ? route.duration_minutes.toString() : '',
      base_price: route.base_price.toString(),
      description: route.description || '',
    });
    setModalVisible(true);
  };

  const renderRouteCard = ({ item }) => (
    <Card style={styles.card}>
      <Card.Content>
        <View style={styles.cardHeader}>
          <Text variant="titleLarge">{item.origin} → {item.destination}</Text>
          <View style={styles.cardActions}>
            <IconButton icon="pencil" size={20} onPress={() => openEditModal(item)} />
            <IconButton icon="delete" size={20} onPress={() => handleDelete(item)} />
          </View>
        </View>
        <Text variant="bodyMedium">Base Price: NPR {item.base_price}</Text>
        {item.distance_km && <Text variant="bodySmall">Distance: {item.distance_km} km</Text>}
        {item.duration_minutes && <Text variant="bodySmall">Duration: {item.duration_minutes} min</Text>}
        <Text variant="bodySmall">Status: {item.is_active ? 'Active' : 'Inactive'}</Text>
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
        data={routes}
        keyExtractor={(item) => item.id.toString()}
        renderItem={renderRouteCard}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        contentContainerStyle={styles.list}
        ListEmptyComponent={<Text style={styles.emptyText}>No routes found</Text>}
      />
      <FAB style={styles.fab} icon="plus" onPress={() => { resetForm(); setModalVisible(true); }} />

      <Modal visible={modalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <ScrollView>
              <Text variant="titleLarge" style={styles.modalTitle}>
                {editingRoute ? 'Edit Route' : 'Add Route'}
              </Text>
              <TextInput
                mode="outlined"
                label="Origin *"
                value={formData.origin}
                onChangeText={(text) => setFormData({ ...formData, origin: text })}
                style={styles.modalInput}
              />
              <TextInput
                mode="outlined"
                label="Destination *"
                value={formData.destination}
                onChangeText={(text) => setFormData({ ...formData, destination: text })}
                style={styles.modalInput}
              />
              <TextInput
                mode="outlined"
                label="Base Price (NPR) *"
                value={formData.base_price}
                onChangeText={(text) => setFormData({ ...formData, base_price: text })}
                keyboardType="numeric"
                style={styles.modalInput}
              />
              <TextInput
                mode="outlined"
                label="Distance (km)"
                value={formData.distance_km}
                onChangeText={(text) => setFormData({ ...formData, distance_km: text })}
                keyboardType="numeric"
                style={styles.modalInput}
              />
              <TextInput
                mode="outlined"
                label="Duration (minutes)"
                value={formData.duration_minutes}
                onChangeText={(text) => setFormData({ ...formData, duration_minutes: text })}
                keyboardType="numeric"
                style={styles.modalInput}
              />
              <TextInput
                mode="outlined"
                label="Description"
                value={formData.description}
                onChangeText={(text) => setFormData({ ...formData, description: text })}
                multiline
                numberOfLines={3}
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