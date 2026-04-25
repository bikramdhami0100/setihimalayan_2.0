import React from "react";
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator } from "react-native";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { router } from "expo-router";
import dayjs from "dayjs";

export default function BusList({ buses, isLoading }) {
  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: '#f8fafc' }}>
        <ActivityIndicator size="large" color="#1e3a8a" />
        <Text style={{ marginTop: 12, color: '#64748b' }}>Searching for buses...</Text>
      </View>
    );
  }

  if (buses.length === 0) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: '#f8fafc', padding: 20 }}>
        <Ionicons name="bus-outline" size={64} color="#cbd5e1" />
        <Text style={{ marginTop: 16, fontSize: 18, fontWeight: 'bold', color: '#0f172a' }}>No buses found</Text>
        <Text style={{ marginTop: 8, color: '#64748b', textAlign: 'center' }}>Try a different date or route to see more options.</Text>
      </View>
    );
  }

  return (
    <ScrollView style={{ flex: 1, backgroundColor: '#f8fafc' }} contentContainerStyle={{ padding: 16 }} showsVerticalScrollIndicator={false}>
      {buses.map((bus) => {
        const departureTime = dayjs(bus.departure_time);
        const arrivalTime = dayjs(bus.arrival_time);
        const durationMs = arrivalTime.diff(departureTime);
        const durationHrs = Math.floor(durationMs / (1000 * 60 * 60));
        const durationMins = Math.floor((durationMs % (1000 * 60 * 60)) / (1000 * 60));

        return (
          <View key={bus.id} style={{ backgroundColor: 'white', borderRadius: 24, padding: 20, marginBottom: 16, elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 10, borderWidth: 1, borderColor: '#f1f5f9' }}>
            {/* Top Row */}
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 16 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <View style={{ width: 44, height: 44, backgroundColor: '#1e3a8a', borderRadius: 12, alignItems: 'center', justifyCenter: 'center', marginRight: 12 }}>
                    <Ionicons name="bus" size={24} color="white" />
                </View>
                <View>
                  <Text style={{ fontSize: 16, fontWeight: 'bold', color: '#0f172a' }}>{bus.bus_number}</Text>
                  <View style={{ flexDirection: 'row', gap: 6, marginTop: 4 }}>
                    <View style={{ backgroundColor: '#f1f5f9', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 }}>
                      <Text style={{ fontSize: 10, color: '#64748b', fontWeight: 'bold' }}>{bus.bus_type?.toUpperCase()}</Text>
                    </View>
                  </View>
                </View>
              </View>
              <View style={{ alignItems: 'flex-end' }}>
                <Text style={{ fontSize: 18, fontWeight: 'bold', color: '#ea580c' }}>NPR {bus.base_price}</Text>
                <Text style={{ fontSize: 10, color: '#94a3b8' }}>per seat</Text>
              </View>
            </View>

            {/* Middle Row: Journey */}
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 20 }}>
              <View style={{ alignItems: 'flex-start', flex: 1 }}>
                <Text style={{ fontSize: 16, fontWeight: 'bold', color: '#0f172a' }}>{departureTime.format('hh:mm A')}</Text>
                <Text style={{ fontSize: 12, color: '#64748b' }}>{bus.origin}</Text>
              </View>

              <View style={{ flex: 1, alignItems: 'center', paddingHorizontal: 10 }}>
                <View style={{ width: '100%', height: 1, backgroundColor: '#e2e8f0', position: 'absolute', top: 10 }} />
                <View style={{ backgroundColor: 'white', paddingHorizontal: 8, zIndex: 1 }}>
                  <Ionicons name="chevron-forward" size={16} color="#cbd5e1" />
                </View>
                <Text style={{ fontSize: 10, color: '#94a3b8', marginTop: 4 }}>{durationHrs}h {durationMins}m</Text>
              </View>

              <View style={{ alignItems: 'flex-end', flex: 1 }}>
                <Text style={{ fontSize: 16, fontWeight: 'bold', color: '#0f172a' }}>{arrivalTime.format('hh:mm A')}</Text>
                <Text style={{ fontSize: 12, color: '#64748b' }}>{bus.destination}</Text>
              </View>
            </View>

            {/* Bottom Row */}
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderTopWidth: 1, borderTopColor: '#f1f5f9', paddingTop: 16 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: bus.available_seats > 10 ? '#22c55e' : '#ef4444', marginRight: 6 }} />
                <Text style={{ fontSize: 12, color: bus.available_seats > 10 ? '#22c55e' : '#ef4444', fontWeight: 'bold' }}>{bus.available_seats} seats available</Text>
              </View>
              <TouchableOpacity 
                onPress={() => router.push({ pathname: "/(customer)/seat-selection", params: { scheduleId: bus.id } })}
                style={{ backgroundColor: '#1e3a8a', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 12 }}
              >
                <Text style={{ color: 'white', fontWeight: 'bold', fontSize: 12 }}>Select Seats</Text>
              </TouchableOpacity>
            </View>
          </View>
        );
      })}
      <View style={{ height: 40 }} />
    </ScrollView>
  );
}
