import React, { useState, useEffect } from "react";
import { View, Text, SafeAreaView, FlatList, TouchableOpacity, ActivityIndicator, Alert, TextInput } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { getAllBookings, cancelBooking } from "../../api/bookings";
import dayjs from "dayjs";

export default function AdminBookings() {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  const fetchBookings = async () => {
    try {
      const res = await getAllBookings();
      setBookings(res.data.data);
    } catch (err) {
      Alert.alert("Error", "Failed to fetch bookings");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBookings();
  }, []);

  const handleCancel = (reference) => {
    Alert.alert("Cancel Booking", "Are you sure you want to cancel this booking?", [
      { text: "No" },
      {
        text: "Yes, Cancel", style: "destructive", onPress: async () => {
          try {
            await cancelBooking(reference, "Cancelled by Admin");
            fetchBookings();
            Alert.alert("Success", "Booking cancelled");
          } catch (err) {
            Alert.alert("Error", "Failed to cancel booking");
          }
        }
      }
    ]);
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'confirmed': return 'bg-green-100 text-green-600';
      case 'pending_payment': return 'bg-orange-100 text-orange-600';
      case 'cancelled': return 'bg-red-100 text-red-600';
      default: return 'bg-gray-100 text-gray-600';
    }
  };

  const filteredBookings = bookings.filter(b =>
    b.reference_number.toLowerCase().includes(search.toLowerCase()) ||
    b.passenger_details?.[0]?.name?.toLowerCase().includes(search.toLowerCase())
  );

  const renderItem = ({ item }) => (
    <View className="bg-white p-5 rounded-3xl mb-4 shadow-sm border border-gray-100">
      <View className="flex-row justify-between items-start mb-3">
        <View>
          <Text className="text-[#1e3a8a] font-black text-base">{item.reference_number}</Text>
          <Text className="text-gray-400 text-[10px] font-bold uppercase tracking-widest">
            {dayjs(item.createdAt).format('DD MMM YYYY, hh:mm A')}
          </Text>
        </View>
        <View className={`px-3 py-1 rounded-full ${getStatusColor(item.status).split(' ')[0]}`}>
          <Text className={`text-[10px] font-black uppercase ${getStatusColor(item.status).split(' ')[1]}`}>
            {item.status.replace('_', ' ')}
          </Text>
        </View>
      </View>

      <View className="flex-row items-center mb-4 bg-gray-50 p-3 rounded-2xl">
        <Ionicons name="person-outline" size={16} color="#64748b" />
        <Text className="text-gray-700 font-bold ml-2 text-sm">
          {item.passenger_details?.[0]?.name || 'N/A'} {item.passenger_details?.length > 1 ? `(+${item.passenger_details.length - 1})` : ''}
        </Text>
        <View className="mx-2 w-1 h-1 rounded-full bg-gray-300" />
        <Text className="text-[#f97316] font-black text-sm">NPR {item.total_amount}</Text>
      </View>

      <View className="flex-row gap-3">
        <TouchableOpacity
          className="flex-1 bg-sky-50 py-3 rounded-xl items-center"
          onPress={() => Alert.alert("Details", JSON.stringify(item, null, 2))}
        >
          <Text className="text-sky-600 font-bold text-xs">View Details</Text>
        </TouchableOpacity>
        {item.status !== 'cancelled' && (
          <TouchableOpacity
            className="flex-1 bg-red-50 py-3 rounded-xl items-center"
            onPress={() => handleCancel(item.reference_number)}
          >
            <Text className="text-red-600 font-bold text-xs">Cancel</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );

  return (
    <SafeAreaView className="flex-1 bg-[#f8fafc]">
      <View className="flex-1 p-4">
        <View className="mb-6">
          <Text className="text-2xl font-black text-[#1e3a8a] mb-1">Bookings</Text>
          <Text className="text-gray-500 text-xs font-medium">Manage all traveler reservations</Text>
        </View>

        <View className="flex-row items-center bg-white px-4 py-3 rounded-2xl shadow-sm border border-gray-100 mb-6">
          <Ionicons name="search-outline" size={20} color="#94a3b8" />
          <TextInput
            className="flex-1 ml-3 text-sm font-semibold text-gray-700"
            placeholder="Search Reference or Name..."
            placeholderTextColor="#94a3b8"
            value={search}
            onChangeText={setSearch}
          />
        </View>

        {loading ? (
          <ActivityIndicator size="large" color="#1e3a8a" className="mt-10" />
        ) : (
          <FlatList
            data={filteredBookings}
            renderItem={renderItem}
            keyExtractor={item => item._id}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingBottom: 20 }}
            ListEmptyComponent={<Text className="text-gray-400 text-center mt-10">No bookings found</Text>}
          />
        )}
      </View>
    </SafeAreaView>
  );
}
