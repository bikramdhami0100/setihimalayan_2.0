import React, { useState, useEffect } from "react";
import { View, Text, SafeAreaView, ScrollView, ActivityIndicator } from "react-native";
import { getUtilizationReport, getBookingStats } from "../../api/reports";
import { Ionicons } from "@expo/vector-icons";

export default function AdminReports() {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState(null);
  const [utilization, setUtilization] = useState([]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [statsRes, utilRes] = await Promise.all([
          getBookingStats(),
          getUtilizationReport()
        ]);
        setStats(statsRes.data.data);
        setUtilization(utilRes.data.data);
      } catch (err) {
        console.error("Reports error:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  if (loading) {
    return (
      <SafeAreaView className="flex-1 bg-[#f8fafc] justify-center items-center">
        <ActivityIndicator size="large" color="#1e3a8a" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-[#f8fafc]">
      <ScrollView className="p-4">
        <Text className="text-2xl font-bold text-[#1e3a8a] mb-6">Reports & Analytics</Text>
        
        <View className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 mb-6">
          <Text className="text-[#1e3a8a] text-lg font-bold mb-4">Bus Utilization</Text>
          {utilization.map((item, idx) => (
            <View key={idx} className="flex-row justify-between py-3 border-b border-gray-50">
              <Text className="text-gray-700">{item.bus_number}</Text>
              <Text className="text-blue-600 font-bold">{item.utilization_rate}%</Text>
            </View>
          ))}
        </View>

        <View className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
          <Text className="text-[#1e3a8a] text-lg font-bold mb-4">Recent Stats</Text>
          <View className="flex-row justify-between mb-4">
            <View className="items-center flex-1">
              <Text className="text-gray-400 text-xs">Conversion</Text>
              <Text className="text-xl font-bold text-gray-800">{stats?.conversion_rate || '0'}%</Text>
            </View>
            <View className="items-center flex-1">
              <Text className="text-gray-400 text-xs">Avg. Booking</Text>
              <Text className="text-xl font-bold text-gray-800">रु {stats?.avg_booking_value || '0'}</Text>
            </View>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
