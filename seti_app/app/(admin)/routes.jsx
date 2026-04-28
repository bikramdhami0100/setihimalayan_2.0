import React, { useState, useEffect } from "react";
import { View, Text, SafeAreaView, FlatList, TouchableOpacity, ActivityIndicator, Alert, Modal, TextInput, ScrollView } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { getRoutes, createRoute, deleteRoute, toggleRouteActive } from "../../api/routes";

export default function AdminRoutes() {
  const [routes, setRoutes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [newRoute, setNewRoute] = useState({ origin: '', destination: '', distance: '', duration: '' });

  const fetchRoutes = async () => {
    try {
      const res = await getRoutes();
      setRoutes(res.data.data);
    } catch (err) {
      Alert.alert("Error", "Failed to fetch routes");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRoutes();
  }, []);

  const handleAddRoute = async () => {
    if (!newRoute.origin || !newRoute.destination) return;
    try {
      await createRoute({
        ...newRoute,
        distance: parseFloat(newRoute.distance),
        duration: newRoute.duration
      });
      setModalVisible(false);
      fetchRoutes();
      Alert.alert("Success", "Route added successfully");
    } catch (err) {
      Alert.alert("Error", "Failed to add route");
    }
  };

  const handleDelete = (id) => {
    Alert.alert("Delete", "Are you sure you want to delete this route?", [
      { text: "Cancel" },
      { text: "Delete", style: "destructive", onPress: async () => {
        try {
          await deleteRoute(id);
          fetchRoutes();
        } catch (err) {
          Alert.alert("Error", "Failed to delete route");
        }
      }}
    ]);
  };

  const renderItem = ({ item }) => (
    <View className="bg-white p-5 rounded-3xl mb-3 shadow-sm border border-gray-100 flex-row justify-between items-center">
      <View className="flex-1">
        <View className="flex-row items-center mb-1">
          <Text className="text-[#1e3a8a] font-black text-base">{item.origin}</Text>
          <Ionicons name="arrow-forward" size={12} color="#94a3b8" style={{ marginHorizontal: 8 }} />
          <Text className="text-[#1e3a8a] font-black text-base">{item.destination}</Text>
        </View>
        <Text className="text-gray-400 text-[10px] font-bold uppercase tracking-widest">
          {item.distance} KM • {item.duration}
        </Text>
      </View>
      <View className="flex-row items-center">
        <TouchableOpacity 
          className={`px-3 py-1 rounded-full mr-3 ${item.is_active ? 'bg-sky-100' : 'bg-gray-100'}`}
          onPress={() => toggleRouteActive(item._id, !item.is_active).then(fetchRoutes)}
        >
          <Text className={`text-[10px] font-black ${item.is_active ? 'text-sky-600' : 'text-gray-400'}`}>
            {item.is_active ? 'ACTIVE' : 'OFF'}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => handleDelete(item._id)}>
          <Ionicons name="trash-outline" size={20} color="#ef4444" />
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <SafeAreaView className="flex-1 bg-[#f8fafc]">
      <View className="flex-1 p-4">
        <View className="flex-row justify-between items-center mb-6">
          <View>
            <Text className="text-2xl font-black text-[#1e3a8a]">Routes</Text>
            <Text className="text-gray-500 text-xs font-medium">Define travel paths</Text>
          </View>
          <TouchableOpacity 
            onPress={() => setModalVisible(true)}
            className="bg-[#1e3a8a] w-12 h-12 rounded-2xl items-center justify-center shadow-lg shadow-blue-200"
          >
            <Ionicons name="add" size={28} color="white" />
          </TouchableOpacity>
        </View>

        {loading ? (
          <ActivityIndicator size="large" color="#1e3a8a" className="mt-10" />
        ) : (
          <FlatList
            data={routes}
            renderItem={renderItem}
            keyExtractor={item => item._id}
            showsVerticalScrollIndicator={false}
            ListEmptyComponent={<Text className="text-gray-400 text-center mt-10">No routes found</Text>}
          />
        )}
      </View>

      <Modal visible={modalVisible} animationType="slide" transparent>
        <View className="flex-1 justify-end bg-black/50">
          <View className="bg-white p-8 rounded-t-[40px] shadow-2xl max-h-[90%]">
            <View className="w-12 h-1.5 bg-gray-100 rounded-full self-center mb-6" />
            <Text className="text-xl font-black text-[#1e3a8a] mb-6">Create New Route</Text>
            
            <ScrollView
              style={{ flexGrow: 1 }}
              contentContainerStyle={{ paddingBottom: 30 }}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
            >
              <View className="flex-row gap-4 mb-4">
                <View className="flex-1">
                  <Text className="text-gray-400 text-[10px] font-bold uppercase mb-2 ml-1">Origin</Text>
                  <TextInput 
                    placeholder="Kathmandu"
                    className="bg-gray-50 p-4 rounded-2xl border border-gray-100 font-semibold"
                    value={newRoute.origin}
                    onChangeText={t => setNewRoute({...newRoute, origin: t})}
                  />
                </View>
                <View className="flex-1">
                  <Text className="text-gray-400 text-[10px] font-bold uppercase mb-2 ml-1">Destination</Text>
                  <TextInput 
                    placeholder="Pokhara"
                    className="bg-gray-50 p-4 rounded-2xl border border-gray-100 font-semibold"
                    value={newRoute.destination}
                    onChangeText={t => setNewRoute({...newRoute, destination: t})}
                  />
                </View>
              </View>

              <View className="flex-row gap-4 mb-8">
                <View className="flex-1">
                  <Text className="text-gray-400 text-[10px] font-bold uppercase mb-2 ml-1">Distance (KM)</Text>
                  <TextInput 
                    placeholder="200"
                    keyboardType="numeric"
                    className="bg-gray-50 p-4 rounded-2xl border border-gray-100 font-semibold"
                    value={newRoute.distance}
                    onChangeText={t => setNewRoute({...newRoute, distance: t})}
                  />
                </View>
                <View className="flex-1">
                  <Text className="text-gray-400 text-[10px] font-bold uppercase mb-2 ml-1">Duration</Text>
                  <TextInput 
                    placeholder="7h 30m"
                    className="bg-gray-50 p-4 rounded-2xl border border-gray-100 font-semibold"
                    value={newRoute.duration}
                    onChangeText={t => setNewRoute({...newRoute, duration: t})}
                  />
                </View>
              </View>

              <View className="flex-row gap-4">
                <TouchableOpacity onPress={() => setModalVisible(false)} className="flex-1 p-5 rounded-2xl bg-gray-100 items-center">
                  <Text className="text-gray-500 font-black">Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={handleAddRoute} className="flex-1 p-5 rounded-2xl bg-[#1e3a8a] items-center shadow-lg shadow-blue-200">
                  <Text className="text-white font-black">Create Route</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}
