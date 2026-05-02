import React, { useEffect, useState } from "react";
import { View, Text, SafeAreaView, ScrollView, TouchableOpacity, Image, ActivityIndicator, Dimensions } from "react-native";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import { useBookings } from "../../hooks/useBookings";
import dayjs from "dayjs";
import { Platform } from "react-native";
import BusMapView from "../../components/BusMapView";

const { width } = Dimensions.get("window");

export default function BookingConfirmation() {
  const { bookingReference } = useLocalSearchParams();
  const { getBookingByReference, currentBooking, isLoading } = useBookings();
  const [localLoading, setLocalLoading] = useState(true);

  useEffect(() => {
    if (bookingReference) {
      getBookingByReference(bookingReference).finally(() => setLocalLoading(false));
    } else {
      setLocalLoading(false);
    }
  }, [bookingReference]);

  if (localLoading || isLoading) {
    return (
      <SafeAreaView className="flex-1 bg-[#f8fafc] justify-center items-center">
        <ActivityIndicator size="large" color="#0f172a" />
        <Text className="mt-4 text-gray-500 font-medium">Finalizing your ticket...</Text>
      </SafeAreaView>
    );
  }

  if (!currentBooking) {
    return (
      <SafeAreaView className="flex-1 bg-[#f8fafc] justify-center items-center p-6">
        <View className="w-20 h-20 bg-red-50 rounded-full items-center justify-center mb-6">
          <Ionicons name="alert-circle" size={48} color="#ef4444" />
        </View>
        <Text className="text-xl font-bold text-gray-900 mb-2">Booking Not Found</Text>
        <Text className="text-gray-500 text-center mb-8">We couldn't find a booking with the reference: {bookingReference}</Text>
        <TouchableOpacity 
          className="bg-[#0f172a] px-8 py-3.5 rounded-full shadow-md"
          onPress={() => router.push("/(customer)/")}
        >
          <Text className="text-white font-bold">Return to Search</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }
  console.log(currentBooking,"this is current boking")

  // Helper variables
  const schedule = currentBooking.schedule_id;
  const isPopulated = typeof schedule === 'object' && schedule !== null;
  const origin = isPopulated ? schedule.route_id?.origin : "Kathmandu";
  const destination = isPopulated ? schedule.route_id?.destination : "Pokhara";
  const departureTime = isPopulated ? dayjs(schedule.departure_time) : dayjs();
  const arrivalTime = isPopulated ? dayjs(schedule.arrival_time) : dayjs().add(5, 'hours');
  const busType = isPopulated ? schedule.bus_id?.bus_type : "AC Deluxe";

  // Mock coordinates for Kathmandu/Kalanki for the map
  const region = {
    latitude: 27.6946,
    longitude: 85.2818,
    latitudeDelta: 0.01,
    longitudeDelta: 0.01,
  };

  return (
    <SafeAreaView style={{ flex: 1 }} className="flex-1 bg-[#f8fafc]">
      <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
        
        {/* Success Header */}
        <View className="bg-[#0f172a] pt-12 pb-24 px-6 items-center">
          <View className="w-20 h-20 bg-[#38bdf8] rounded-full items-center justify-center mb-4 shadow-lg shadow-sky-400">
            <Ionicons name="checkmark-circle" size={56} color="#0f172a" />
          </View>
          <Text className="text-white text-2xl font-black mb-1">Booking Confirmed!</Text>
          <Text className="text-gray-400 text-center font-medium">Your trip to {destination} is locked in.</Text>
        </View>

        {/* Floating Ticket Card */}
        <View className="mx-5 -mt-16 bg-white rounded-3xl shadow-xl shadow-gray-200 border border-gray-100 overflow-hidden mb-6">
          <View className="p-6">
            <View className="flex-row justify-between items-center mb-6">
              <View>
                <Text className="text-gray-400 text-[10px] font-bold tracking-widest uppercase mb-1">Booking Ref</Text>
                <Text className="text-[#0f172a] text-lg font-black">{currentBooking.reference_number}</Text>
              </View>
              <View className="bg-sky-50 px-3 py-1.5 rounded-full border border-sky-100">
                <Text className="text-sky-600 text-[10px] font-black uppercase">Confirmed</Text>
              </View>
            </View>

            <View className="flex-row items-center justify-between mb-8">
              <View className="items-center">
                <Text className="text-[#0f172a] text-xl font-black">{origin}</Text>
                <Text className="text-gray-400 text-xs font-medium">{departureTime.format('hh:mm A')}</Text>
              </View>
              
              <View className="flex-1 items-center px-4">
                <View className="w-full h-[1px] bg-gray-200 relative">
                  <View className="absolute -top-1.5 left-1/2 -ml-2 bg-white px-1">
                    <Ionicons name="bus" size={12} color="#38bdf8" />
                  </View>
                </View>
                <Text className="text-gray-400 text-[8px] font-bold mt-1 uppercase">Direct Trip</Text>
              </View>

              <View className="items-center">
                <Text className="text-[#0f172a] text-xl font-black">{destination}</Text>
                <Text className="text-gray-400 text-xs font-medium">{arrivalTime.format('hh:mm A')}</Text>
              </View>
            </View>

            <View className="flex-row justify-between border-t border-b border-gray-50 py-4 mb-6">
              <View>
                <Text className="text-gray-400 text-[9px] font-bold tracking-widest uppercase mb-1">Seats</Text>
                <Text className="text-gray-800 text-sm font-bold">
                  {Array.isArray(currentBooking.selected_seats) ? currentBooking.selected_seats.join(', ') : currentBooking.selected_seats}
                </Text>
              </View>
              <View className="items-center">
                <Text className="text-gray-400 text-[9px] font-bold tracking-widest uppercase mb-1">Bus Type</Text>
                <Text className="text-gray-800 text-sm font-bold">{busType}</Text>
              </View>
              <View className="items-end">
                <Text className="text-gray-400 text-[9px] font-bold tracking-widest uppercase mb-1">Total Paid</Text>
                <Text className="text-[#f97316] text-sm font-black">NPR {currentBooking.total_amount}</Text>
              </View>
            </View>

            <TouchableOpacity 
              className="bg-[#0f172a] rounded-2xl py-4 items-center flex-row justify-center shadow-lg shadow-slate-300"
              onPress={() => router.push({ pathname: "/(customer)/ticket", params: { reference: currentBooking.reference_number } })}
            >
              <Ionicons name="ticket-outline" size={20} color="white" className="mr-2" />
              <Text className="text-white font-bold ml-2">View E-Ticket</Text>
            </TouchableOpacity>
          </View>
        </View>


        {/* Map Section */}
        <View className="mx-5 mb-8">
          <Text className="text-[#0f172a] text-base font-black mb-3">Boarding Location</Text>
          <View className="rounded-3xl overflow-hidden border border-gray-100 shadow-sm h-48 bg-gray-200">
            <BusMapView region={region} />
            <View className="absolute bottom-4 left-4 right-4 bg-white/90 p-3 rounded-2xl flex-row items-center">
              <View className="bg-sky-50 p-2 rounded-xl mr-3">
                <Ionicons name="location" size={16} color="#0284c7" />
              </View>
              <View className="flex-1">
                <Text className="text-gray-900 text-xs font-bold">Kalanki Bus Stand</Text>
                <Text className="text-gray-500 text-[10px]">Ring Road, Kathmandu</Text>
              </View>
              <TouchableOpacity className="bg-[#0f172a] px-3 py-1.5 rounded-lg">
                <Text className="text-white text-[10px] font-bold">Navigate</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        <TouchableOpacity 
          onPress={() => router.push("/(customer)/")}
          className="mx-5 mb-10 py-4 items-center"
        >
          <Text className="text-gray-500 font-bold">Back to Home</Text>
        </TouchableOpacity>

      </ScrollView>
    </SafeAreaView>
  );
}
