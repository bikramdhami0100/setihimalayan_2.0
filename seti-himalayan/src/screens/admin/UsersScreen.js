import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  FlatList,
  RefreshControl,
  Alert,
} from 'react-native';
import { Text, Card, Button, ActivityIndicator, Chip, IconButton } from 'react-native-paper';
import api from '../../api/client';
import useUIStore from '../../store/uiStore';
import { colors } from '../../utils/colors';

export default function UsersScreen() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const { showSnackbar } = useUIStore();

  const fetchUsers = async () => {
    try {
      const response = await api.get('/users'); // assuming endpoint exists
      setUsers(response.data.data.users);
    } catch (error) {
      showSnackbar(error.response?.data?.message || 'Failed to load users', 'error');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    fetchUsers();
  };

  const toggleUserStatus = async (user) => {
    const newStatus = user.status === 'active' ? 'suspended' : 'active';
    Alert.alert('Confirm', `${newStatus === 'active' ? 'Activate' : 'Suspend'} user ${user.full_name}?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Confirm',
        onPress: async () => {
          try {
            await api.patch(`/users/${user.id}/status`, { status: newStatus });
            showSnackbar(`User ${newStatus === 'active' ? 'activated' : 'suspended'}`, 'success');
            fetchUsers();
          } catch (error) {
            showSnackbar('Failed to update user status', 'error');
          }
        },
      },
    ]);
  };

  const renderUserCard = ({ item }) => (
    <Card style={styles.card}>
      <Card.Content>
        <View style={styles.cardHeader}>
          <Text variant="titleMedium">{item.full_name}</Text>
          <Chip mode="outlined" style={item.status === 'active' ? styles.chipActive : styles.chipInactive}>
            {item.status}
          </Chip>
        </View>
        <Text variant="bodySmall">Email: {item.email}</Text>
        <Text variant="bodySmall">Phone: {item.phone}</Text>
        <Text variant="bodySmall">Role: {item.role}</Text>
        <View style={styles.cardActions}>
          <IconButton icon="account-edit" size={20} onPress={() => Alert.alert('Edit User', 'Edit functionality coming soon')} />
          <IconButton
            icon={item.status === 'active' ? 'account-cancel' : 'account-check'}
            size={20}
            onPress={() => toggleUserStatus(item)}
          />
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
        data={users}
        keyExtractor={(item) => item.id.toString()}
        renderItem={renderUserCard}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        contentContainerStyle={styles.list}
        ListEmptyComponent={<Text style={styles.emptyText}>No users found</Text>}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  list: { padding: 16 },
  card: { marginBottom: 12, elevation: 2 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  chipActive: { borderColor: colors.success, color: colors.success },
  chipInactive: { borderColor: colors.error, color: colors.error },
  cardActions: { flexDirection: 'row', justifyContent: 'flex-end', marginTop: 8 },
  emptyText: { textAlign: 'center', marginTop: 40, color: colors.textSecondary },
});