import React, { useState, useEffect } from "react";
import { View, Text, SafeAreaView, FlatList, TouchableOpacity, ActivityIndicator, Alert, Modal, TextInput, ScrollView } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { getSchedules, createSchedule, cancelSchedule } from "../../api/schedules";
import { getRoutes } from "../../api/routes";
import { getBuses } from "../../api/buses";
import dayjs from "dayjs";

export default function AdminSchedules() {
  const [schedules, setSchedules] = useState([]);
  const [routes, setRoutes] = useState([]);
  const [buses, setBuses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [newSchedule, setNewSchedule] = useState({ 
    route_id: '', 
    bus_id: '', 
    departure_time: dayjs().add(1, 'day').format('YYYY-MM-DD HH:mm:ss'), 
    base_price: '' 
  });

  const fetchData = async () => {
    try {
      const [schedRes, routesRes, busesRes] = await Promise.all([
        getSchedules(),
        getRoutes(),
        getBuses()
      ]);
      setSchedules(schedRes.data.data);
      setRoutes(routesRes.data.data);
      setBuses(busesRes.data.data);
    } catch (err) {
      Alert.alert("Error", "Failed to fetch data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleCreate = async () => {
    if (!newSchedule.route_id || !newSchedule.bus_id || !newSchedule.base_price) {
      Alert.alert("Validation", "Please fill all fields");
      return;
    }
    try {
      await createSchedule({
        ...newSchedule,
        base_price: parseFloat(newSchedule.base_price)
      });
      setModalVisible(false);
      fetchData();
      Alert.alert("Success", "Schedule created");
    } catch (err) {
      Alert.alert("Error", "Failed to create schedule");
    }
  };

  const handleCancel = (id) => {
    Alert.alert("Cancel", "Cancel this schedule?", [
      { text: "No" },
      { text: "Yes", style: "destructive", onPress: async () => {
        try {
          await cancelSchedule(id, "Cancelled by Admin");
          fetchData();
        } catch (err) {
          Alert.alert("Error", "Failed to cancel");
        }
      }}
    ]);
  };

  const renderItem = ({ item }) => {
    const route = routes.find(r => r._id === item.route_id?._id || r._id === item.route_id);
    const bus = buses.find(b => b._id === item.bus_id?._id || b._id === item.bus_id);

    return (
      <View className="bg-white p-5 rounded-3xl mb-4 shadow-sm border border-gray-100">
        <View className="flex-row justify-between items-start mb-3">
          <View className="flex-1">
            <Text className="text-[#1e3a8a] font-black text-sm">
              {item.route_id?.origin || 'Unknown'} → {item.route_id?.destination || 'Unknown'}
            </Text>
            <Text className="text-gray-400 text-[10px] font-bold uppercase tracking-widest mt-1">
              {dayjs(item.departure_time).format('DD MMM, hh:mm A')}
            </Text>
          </View>
          <View className={`px-3 py-1 rounded-full ${item.status === 'active' ? 'bg-green-100' : 'bg-red-100'}`}>
            <Text className={`text-[10px] font-black uppercase ${item.status === 'active' ? 'text-green-600' : 'text-red-600'}`}>
              {item.status}
            </Text>
          </View>
        </View>

        <View className="flex-row items-center mb-4 bg-gray-50 p-3 rounded-2xl">
          <Ionicons name="bus-outline" size={16} color="#64748b" />
          <Text className="text-gray-700 font-bold ml-2 text-xs">{item.bus_id?.bus_number || 'No Bus'}</Text>
          <View className="mx-2 w-1 h-1 rounded-full bg-gray-300" />
          <Text className="text-blue-600 font-black text-xs">NPR {item.base_price}</Text>
        </View>

        <View className="flex-row gap-3">
          <TouchableOpacity 
            className="flex-1 bg-gray-100 py-3 rounded-xl items-center"
            onPress={() => Alert.alert("Details", JSON.stringify(item, null, 2))}
          >
            <Text className="text-gray-500 font-bold text-xs">View</Text>
          </TouchableOpacity>
          {item.status === 'active' && (
            <TouchableOpacity 
              className="flex-1 bg-red-50 py-3 rounded-xl items-center"
              onPress={() => handleCancel(item._id)}
            >
              <Text className="text-red-600 font-bold text-xs">Cancel</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView className="flex-1 bg-[#f8fafc]">
      <View className="flex-1 p-4">
        <View className="flex-row justify-between items-center mb-6">
          <View>
            <Text className="text-2xl font-black text-[#1e3a8a]">Schedules</Text>
            <Text className="text-gray-500 text-xs font-medium">Manage bus departures</Text>
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
            data={schedules}
            renderItem={renderItem}
            keyExtractor={item => item._id}
            showsVerticalScrollIndicator={false}
            ListEmptyComponent={<Text className="text-gray-400 text-center mt-10">No schedules found</Text>}
          />
        )}
      </View>

      <Modal visible={modalVisible} animationType="slide" transparent>
        <View className="flex-1 justify-end bg-black/50">
          <View className="bg-white p-8 rounded-t-[40px] shadow-2xl h-[85%]">
            <View className="w-12 h-1.5 bg-gray-100 rounded-full self-center mb-6" />
            <Text className="text-xl font-black text-[#1e3a8a] mb-6">Create Schedule</Text>
            
            <ScrollView showsVerticalScrollIndicator={false}>
              <Text className="text-gray-400 text-[10px] font-bold uppercase mb-2 ml-1">Select Route</Text>
              <View className="flex-row flex-wrap gap-2 mb-4">
                {routes.map(r => (
                  <TouchableOpacity 
                    key={r._id}
                    onPress={() => setNewSchedule({...newSchedule, route_id: r._id})}
                    className={`px-4 py-3 rounded-2xl border ${newSchedule.route_id === r._id ? 'bg-blue-50 border-blue-400' : 'bg-gray-50 border-gray-100'}`}
                  >
                    <Text className={`text-xs font-bold ${newSchedule.route_id === r._id ? 'text-blue-600' : 'text-gray-500'}`}>
                      {r.origin} → {r.destination}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text className="text-gray-400 text-[10px] font-bold uppercase mb-2 ml-1">Select Bus</Text>
              <View className="flex-row flex-wrap gap-2 mb-4">
                {buses.map(b => (
                  <TouchableOpacity 
                    key={b._id}
                    onPress={() => setNewSchedule({...newSchedule, bus_id: b._id})}
                    className={`px-4 py-3 rounded-2xl border ${newSchedule.bus_id === b._id ? 'bg-blue-50 border-blue-400' : 'bg-gray-50 border-gray-100'}`}
                  >
                    <Text className={`text-xs font-bold ${newSchedule.bus_id === b._id ? 'text-blue-600' : 'text-gray-500'}`}>
                      {b.bus_number}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text className="text-gray-400 text-[10px] font-bold uppercase mb-2 ml-1">Price (NPR)</Text>
              <TextInput 
                placeholder="1200"
                keyboardType="numeric"
                className="bg-gray-50 p-4 rounded-2xl border border-gray-100 font-semibold mb-4"
                value={newSchedule.base_price}
                onChangeText={t => setNewSchedule({...newSchedule, base_price: t})}
              />

              <Text className="text-gray-400 text-[10px] font-bold uppercase mb-2 ml-1">Departure (YYYY-MM-DD HH:mm:ss)</Text>
              <TextInput 
                placeholder={dayjs().format('YYYY-MM-DD HH:mm:ss')}
                className="bg-gray-50 p-4 rounded-2xl border border-gray-100 font-semibold mb-8"
                value={newSchedule.departure_time}
                onChangeText={t => setNewSchedule({...newSchedule, departure_time: t})}
              />

              <View className="flex-row gap-4 mb-10">
                <TouchableOpacity onPress={() => setModalVisible(false)} className="flex-1 p-5 rounded-2xl bg-gray-100 items-center">
                  <Text className="text-gray-500 font-black">Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={handleCreate} className="flex-1 p-5 rounded-2xl bg-[#1e3a8a] items-center shadow-lg shadow-blue-200">
                  <Text className="text-white font-black">Create</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}
