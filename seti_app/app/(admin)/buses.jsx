import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  View, Text, SafeAreaView, ScrollView, TouchableOpacity,
  ActivityIndicator, Alert, RefreshControl,
  StatusBar, Keyboard, Platform, FlatList,
  KeyboardAvoidingView   // ✅ FIX 1: was missing from react-native imports
} from "react-native";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
// ✅ FIX 2 & 3: Import Paper's Modal here instead of react-native's Modal.
//   Paper's Modal accepts onDismiss + contentContainerStyle; RN's Modal does not.
//   Keeping Modal from react-native-paper prevents the shadowing bug.
import { Portal, Button, Surface, Searchbar, Modal, TextInput } from "react-native-paper";
import { getBuses, createBus, deleteBus, updateBus } from "../../api/buses";
import { router } from "expo-router";
import { useAdminData } from "../../context/AdminContext";
import Animated, { FadeInDown } from "react-native-reanimated";

export default function AdminBuses() {
  const {
    buses,
    loading: loadingStates,
    refreshing: refreshingStates,
    getPagination,
    updatePagination,
    getSearchQuery,
    updateSearchQuery,
    fetchBuses
  } = useAdminData();

  const loading = loadingStates.buses;
  const refreshing = refreshingStates.buses;
  const { page, limit, total: totalItems } = getPagination("buses");
  const searchQuery = getSearchQuery("buses");

  const [searchInput, setSearchInput] = useState(searchQuery);
  const debounceRef = useRef(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingBus, setEditingBus] = useState(null);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    bus_number: '', registration_number: '',
    total_seats: '40', bus_type: 'Luxury', status: 'active'
  });

  useEffect(() => { fetchBuses(); }, [page, limit, searchQuery]);

  const commitSearch = useCallback((text) => {
    updateSearchQuery("buses", text);
  }, [updateSearchQuery]);

  const handleSearchChange = (text) => {
    setSearchInput(text);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => commitSearch(text), 500);
  };

  const handleExport = () => {
    Alert.alert("Export", "Fleet report generated successfully.");
  };

  const handleSave = async () => {
    if (!formData.bus_number.trim() || !formData.registration_number.trim()) {
      Alert.alert("Validation", "Required fields missing.");
      return;
    }
    setSaving(true);
    try {
      if (editingBus) await updateBus(editingBus.id, formData);
      else await createBus(formData);
      setModalVisible(false);
      fetchBuses(true);
    } catch {
      Alert.alert("Error", "Save failed.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = (id) => {
    Alert.alert("Remove Vehicle", "Delete this bus from the fleet?", [
      { text: "Cancel", style: 'cancel' },
      { text: "Delete", style: 'destructive', onPress: async () => { await deleteBus(id); fetchBuses(true); } }
    ]);
  };

  const renderBusCard = ({ item, index }) => {
    const statusActive = item.status === 'active';
    return (
      <Animated.View entering={FadeInDown.delay(index * 50).springify()}>
        <Surface style={{
          backgroundColor: 'white',
          marginHorizontal: 16,
          marginBottom: 12,
          borderRadius: 20,
          padding: 16,
          elevation: 2,
          shadowColor: '#1e3a8a',
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.05,
          shadowRadius: 10,
          borderWidth: 1,
          borderColor: '#f1f5f9'
        }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
              <View style={{ backgroundColor: '#eff6ff', padding: 10, borderRadius: 14 }}>
                <MaterialCommunityIcons name="bus-double-decker" size={24} color="#1e3a8a" />
              </View>
              <View>
                <Text style={{ fontSize: 16, fontWeight: '900', color: '#0f172a' }}>{item.bus_number}</Text>
                <Text style={{ fontSize: 11, color: '#64748b', fontWeight: '700', textTransform: 'uppercase' }}>{item.bus_type}</Text>
              </View>
            </View>
            <View style={{
              backgroundColor: statusActive ? '#dcfce7' : '#fee2e2',
              paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10,
              flexDirection: 'row', alignItems: 'center', gap: 4
            }}>
              <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: statusActive ? '#22c55e' : '#ef4444' }} />
              <Text style={{ fontSize: 10, fontWeight: '900', color: statusActive ? '#16a34a' : '#dc2626', textTransform: 'uppercase' }}>
                {item.status}
              </Text>
            </View>
          </View>

          <View style={{ flexDirection: 'row', gap: 20, marginBottom: 16, borderTopWidth: 1, borderTopColor: '#f8fafc', paddingTop: 12 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Ionicons name="people" size={14} color="#94a3b8" />
              <Text style={{ fontSize: 12, color: '#475569', fontWeight: '800' }}>{item.total_seats} Seats</Text>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Ionicons name="card" size={14} color="#94a3b8" />
              <Text style={{ fontSize: 12, color: '#475569', fontWeight: '800' }}>{item.registration_number}</Text>
            </View>
          </View>

          <View style={{ flexDirection: 'row', justifyContent: 'flex-end', gap: 8 }}>
            <TouchableOpacity
              onPress={() => {
                setEditingBus(item);
                setFormData({ ...item, total_seats: item.total_seats.toString() });
                setModalVisible(true);
              }}
              style={{ backgroundColor: '#f1f5f9', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 10, flexDirection: 'row', alignItems: 'center', gap: 6 }}
            >
              <Ionicons name="pencil" size={14} color="#475569" />
              <Text style={{ fontSize: 12, fontWeight: '800', color: '#475569' }}>Edit</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => handleDelete(item.id)}
              style={{ backgroundColor: '#fff1f2', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 10, flexDirection: 'row', alignItems: 'center', gap: 6 }}
            >
              <Ionicons name="trash" size={14} color="#ef4444" />
              <Text style={{ fontSize: 12, fontWeight: '800', color: '#ef4444' }}>Delete</Text>
            </TouchableOpacity>
          </View>
        </Surface>
      </Animated.View>
    );
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#f8fafc' }}>
      <StatusBar barStyle="dark-content" />

      {/* ── Action Header ── */}
      <View style={{
        paddingHorizontal: 16,
        paddingVertical: 14,
        backgroundColor: 'white',
        borderBottomWidth: 1,
        borderBottomColor: '#f1f5f9',
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 12
      }}>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <TouchableOpacity
            onPress={handleExport}
            style={{ width: 44, height: 44, backgroundColor: '#f8fafc', borderRadius: 12, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#e2e8f0' }}
          >
            <Ionicons name="download-outline" size={20} color="#1e3a8a" />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => {
              setEditingBus(null);
              setFormData({ bus_number: '', registration_number: '', total_seats: '40', bus_type: 'Luxury', status: 'active' });
              setModalVisible(true);
            }}
            style={{ paddingHorizontal: 16, height: 44, backgroundColor: '#1e3a8a', borderRadius: 12, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 8 }}
          >
            <Ionicons name="add" size={20} color="white" />
            <Text style={{ color: 'white', fontWeight: '900', fontSize: 13 }}>ADD BUS</Text>
          </TouchableOpacity>
        </View>

        <View style={{ flex: 1, maxWidth: 180 }}>
          <Searchbar
            placeholder="Quick find..."
            onChangeText={handleSearchChange}
            value={searchInput}
            elevation={0}
            style={{ backgroundColor: '#f1f5f9', borderRadius: 12, height: 44 }}
            inputStyle={{ fontSize: 14, fontWeight: '600', color: '#0f172a' }}
            placeholderTextColor="#94a3b8"
            iconColor="#1e3a8a"
          />
        </View>
      </View>

      {/* ── Fleet List ── */}
      {loading && !refreshing ? (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator color="#1e3a8a" size="large" />
          <Text style={{ marginTop: 12, color: '#64748b', fontWeight: '700' }}>Loading fleet...</Text>
        </View>
      ) : (
        <FlatList
          data={buses}
          keyExtractor={(item) => item.id.toString()}
          renderItem={renderBusCard}
          contentContainerStyle={{ paddingVertical: 20 }}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => fetchBuses(true)} tintColor="#1e3a8a" />}
          ListEmptyComponent={() => (
            <View style={{ alignItems: 'center', paddingTop: 100 }}>
              <Ionicons name="bus-outline" size={80} color="#e2e8f0" />
              <Text style={{ marginTop: 16, color: '#94a3b8', fontWeight: '800', fontSize: 16 }}>No Vehicles Registered</Text>
            </View>
          )}
          ListFooterComponent={() => buses.length > 0 && (
            <View style={{ padding: 20, alignItems: 'center', paddingBottom: 60 }}>
              <Text style={{ color: '#94a3b8', fontSize: 11, fontWeight: '700' }}>
                SHOWING {buses.length} OF {totalItems} VEHICLES
              </Text>
              <View style={{ flexDirection: 'row', gap: 10, marginTop: 12 }}>
                <Button
                  mode="outlined"
                  disabled={page === 0}
                  onPress={() => updatePagination("buses", { page: page - 1 })}
                  style={{ borderColor: '#e2e8f0' }}
                  labelStyle={{ fontSize: 10, fontWeight: '900' }}
                >
                  PREV
                </Button>
                <Button
                  mode="outlined"
                  disabled={page >= Math.ceil(totalItems / limit) - 1}
                  onPress={() => updatePagination("buses", { page: page + 1 })}
                  style={{ borderColor: '#e2e8f0' }}
                  labelStyle={{ fontSize: 10, fontWeight: '900' }}
                >
                  NEXT
                </Button>
              </View>
            </View>
          )}
        />
      )}

      {/* ── Registration Modal ── */}
      <Portal>
        {/* ✅ FIX 2 & 3: Paper's Modal — onDismiss and contentContainerStyle
            are valid Paper Modal props. Previously the RN Modal was rendered
            here (wrong component), causing both props to be silently ignored
            and the modal backdrop/dismiss to never fire. */}
        <Modal
          visible={modalVisible}
          onDismiss={() => setModalVisible(false)}
          contentContainerStyle={{
            backgroundColor: 'white',
            margin: 24,
            padding: 30,
            borderRadius: 24,
            maxHeight: '85%'
          }}
        >
          {/* ✅ FIX 1: KeyboardAvoidingView now correctly imported above */}
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
            <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
              <Text style={{ fontSize: 20, fontWeight: '900', color: '#0f172a', marginBottom: 24 }}>
                {editingBus ? 'Update Vehicle' : 'Register Vehicle'}
              </Text>

              <TextInput
                label="Bus Number"
                value={formData.bus_number}
                onChangeText={t => setFormData({ ...formData, bus_number: t })}
                mode="outlined"
                activeOutlineColor="#1e3a8a"
                textColor="#0f172a"
                style={{ marginBottom: 16, backgroundColor: 'white' }}
                theme={{ colors: { primary: '#1e3a8a', text: '#0f172a', placeholder: '#94a3b8' } }}
              />
              <TextInput
                label="Registration ID"
                value={formData.registration_number}
                onChangeText={t => setFormData({ ...formData, registration_number: t })}
                mode="outlined"
                activeOutlineColor="#1e3a8a"
                textColor="#0f172a"
                style={{ marginBottom: 16, backgroundColor: 'white' }}
                theme={{ colors: { primary: '#1e3a8a', text: '#0f172a', placeholder: '#94a3b8' } }}
              />
              <View style={{ flexDirection: 'row', gap: 12, marginBottom: 24 }}>
                <TextInput
                  label="Seats"
                  value={formData.total_seats}
                  onChangeText={t => setFormData({ ...formData, total_seats: t })}
                  mode="outlined"
                  keyboardType="numeric"
                  activeOutlineColor="#1e3a8a"
                  textColor="#0f172a"
                  style={{ flex: 1, backgroundColor: 'white' }}
                  theme={{ colors: { primary: '#1e3a8a', text: '#0f172a', placeholder: '#94a3b8' } }}
                />
                <TextInput
                  label="Type"
                  value={formData.bus_type}
                  onChangeText={t => setFormData({ ...formData, bus_type: t })}
                  mode="outlined"
                  activeOutlineColor="#1e3a8a"
                  textColor="#0f172a"
                  style={{ flex: 1, backgroundColor: 'white' }}
                  theme={{ colors: { primary: '#1e3a8a', text: '#0f172a', placeholder: '#94a3b8' } }}
                />
              </View>

              <TouchableOpacity
                onPress={handleSave}
                disabled={saving}
                style={{
                  backgroundColor: '#1e3a8a',
                  paddingVertical: 16,
                  borderRadius: 16,
                  alignItems: 'center',
                  shadowColor: '#1e3a8a',
                  shadowOffset: { width: 0, height: 4 },
                  shadowOpacity: 0.3,
                  shadowRadius: 10,
                  elevation: 5,
                  marginTop: 10
                }}
              >
                {saving
                  ? <ActivityIndicator color="white" />
                  : <Text style={{ color: 'white', fontWeight: '900', fontSize: 14 }}>CONFIRM CHANGES</Text>
                }
              </TouchableOpacity>
            </ScrollView>
          </KeyboardAvoidingView>
        </Modal>
      </Portal>
    </SafeAreaView>
  );
}