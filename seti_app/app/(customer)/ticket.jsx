import React from "react";
import { View, Text, SafeAreaView, ScrollView, TouchableOpacity, Image } from "react-native";
import { Ionicons, MaterialCommunityIcons, FontAwesome5 } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import QRCode from "react-native-qrcode-svg";
import dayjs from "dayjs";

export default function Ticket() {
  const params = useLocalSearchParams();
  
  // Mock data if no params provided
  const bookingData = {
    reference: params.reference || "SH-8829-XP",
    passenger: params.passenger || "Aryan Sharma",
    seat: params.seat || "A12",
    busType: params.busType || "Deluxe Super",
    busPlate: params.busPlate || "BA 2 KHA 4055",
    origin: params.origin || "KATHMANDU",
    destination: params.destination || "POKHARA",
    originStand: params.originStand || "Kalanki Stand",
    destinationStand: params.destinationStand || "Prithvi Chowk",
    date: params.date || "Oct 24, 2023",
    time: params.time || "06:45 AM",
  };

  const qrValue = JSON.stringify({
    id: bookingData.reference,
    p: bookingData.passenger,
    s: bookingData.seat
  });

  return (
    <SafeAreaView style={{ flex: 1 }} className="flex-1 bg-[#f8fafc]">
      {/* Header */}
      <View className="flex-row items-center justify-between px-4 py-3 bg-white border-b border-gray-100">
        <View className="flex-row items-center">
          <TouchableOpacity onPress={() => router.back()} className="mr-3">
            <Ionicons name="arrow-back" size={24} color="#1d3557" />
          </TouchableOpacity>
          <Text className="text-[#1d3557] text-lg font-bold">E-Ticket</Text>
        </View>
        <View className="flex-row items-center">
          <TouchableOpacity className="mr-4">
            <Ionicons name="share-social-outline" size={22} color="#1d3557" />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => router.push("/(customer)/profile")}>
            <View className="w-8 h-8 rounded-full bg-slate-800 items-center justify-center overflow-hidden">
              <Ionicons name="person" size={20} color="white" style={{ marginTop: 4 }} />
            </View>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView className="flex-1 px-4 py-4" showsVerticalScrollIndicator={false}>
        
        {/* Status Pill */}
        <View className="items-center mb-5">
          <View className="bg-green-50 px-4 py-1.5 rounded-full flex-row items-center border border-green-100">
            <View className="w-1.5 h-1.5 bg-green-600 rounded-full mr-2" />
            <Text className="text-green-700 text-[10px] font-bold tracking-widest uppercase">Valid Ticket</Text>
          </View>
        </View>

        {/* Main Ticket Card */}
        <View className="bg-white rounded-3xl shadow-sm border border-gray-100 mb-6 overflow-hidden relative">
          
          {/* Top Section */}
          <View className="bg-[#0f172a] p-5 flex-row justify-between items-center">
            <View>
              <Text className="text-gray-400 text-[9px] font-bold tracking-widest mb-1 uppercase">Official Carrier</Text>
              <Text className="text-white text-lg font-extrabold tracking-wide">SETI HIMALAYAN</Text>
            </View>
            <View className="border border-white/20 bg-white/10 px-3 py-1.5 rounded-lg">
              <Text className="text-white text-[10px] font-bold tracking-widest">CONFIRMED</Text>
            </View>
          </View>
          
          {/* QR Code Section */}
          <View className="items-center pt-8 pb-6 bg-white">
            <View className="p-4 bg-white rounded-3xl shadow-sm border border-gray-100 mb-4">
              <QRCode
                value={qrValue}
                size={160}
                color="#0f172a"
                backgroundColor="white"
              />
            </View>
            <Text className="text-gray-500 text-[10px] font-bold tracking-widest">TICKET ID: {bookingData.reference}</Text>
          </View>

          {/* Details Grid */}
          <View className="px-6 pb-2">
            {/* Row 1 */}
            <View className="flex-row justify-between mb-5">
              <View className="flex-1">
                <Text className="text-gray-400 text-[9px] font-bold tracking-widest mb-1 uppercase">Passenger</Text>
                <Text className="text-gray-800 text-sm font-semibold">{bookingData.passenger}</Text>
              </View>
              <View className="flex-1 items-start">
                <Text className="text-gray-400 text-[9px] font-bold tracking-widest mb-1 uppercase">Seat</Text>
                <View className="flex-row items-center">
                  <MaterialCommunityIcons name="seat-passenger" size={14} color="#0284c7" className="mr-1" />
                  <Text className="text-gray-800 text-sm font-semibold">{bookingData.seat}</Text>
                </View>
              </View>
            </View>

            {/* Row 2 */}
            <View className="flex-row justify-between mb-6">
              <View className="flex-1">
                <Text className="text-gray-400 text-[9px] font-bold tracking-widest mb-1 uppercase">Bus Type</Text>
                <View className="flex-row items-center">
                  <Text className="text-gray-800 text-sm font-semibold mr-1">{bookingData.busType}</Text>
                  <MaterialCommunityIcons name="check-decagram" size={12} color="#0ea5e9" />
                </View>
              </View>
              <View className="flex-1 items-start">
                <Text className="text-gray-400 text-[9px] font-bold tracking-widest mb-1 uppercase">Bus Plate</Text>
                <Text className="text-gray-800 text-sm font-semibold">{bookingData.busPlate}</Text>
              </View>
            </View>
          </View>

          {/* Route Box */}
          <View className="bg-slate-50 mx-5 p-4 rounded-2xl flex-row items-center mb-5 border border-slate-100">
            <View className="flex-1 items-start">
              <Text className="text-gray-400 text-[9px] font-bold tracking-widest mb-1 uppercase">From</Text>
              <Text className="text-[#1e3a8a] text-lg font-bold">{bookingData.origin}</Text>
              <Text className="text-gray-400 text-[10px]">{bookingData.originStand}</Text>
            </View>
            
            <View className="px-2 items-center justify-center relative">
               <View className="absolute w-12 h-px bg-gray-300 top-1/2 mt-1" />
               <View className="bg-slate-50 p-1 z-10">
                 <Ionicons name="bus" size={20} color="#0284c7" />
               </View>
            </View>

            <View className="flex-1 items-end">
              <Text className="text-gray-400 text-[9px] font-bold tracking-widest mb-1 uppercase">To</Text>
              <Text className="text-[#1e3a8a] text-lg font-bold">{bookingData.destination}</Text>
              <Text className="text-gray-400 text-[10px]">{bookingData.destinationStand}</Text>
            </View>
          </View>

          {/* Date & Time */}
          <View className="flex-row justify-between px-6 pb-6">
            <View className="flex-row items-center">
              <Ionicons name="calendar-outline" size={16} color="#6b7280" className="mr-2" />
              <View>
                <Text className="text-gray-400 text-[9px] font-bold tracking-widest mb-0.5 uppercase">Departure</Text>
                <Text className="text-gray-800 text-xs font-semibold">{bookingData.date}</Text>
              </View>
            </View>
            <View className="flex-row items-center">
              <Ionicons name="time-outline" size={16} color="#6b7280" className="mr-2" />
              <View>
                <Text className="text-gray-400 text-[9px] font-bold tracking-widest mb-0.5 uppercase">Boarding</Text>
                <Text className="text-gray-800 text-xs font-semibold">{bookingData.time}</Text>
              </View>
            </View>
          </View>

          {/* Cutouts & Dotted Line */}
          <View className="relative h-px flex-row items-center justify-center bg-white">
            <View className="absolute left-[-12px] w-6 h-6 bg-[#f8fafc] rounded-full z-10 border-r border-gray-100" />
            <View className="w-full border-t border-dashed border-gray-200" />
            <View className="absolute right-[-12px] w-6 h-6 bg-[#f8fafc] rounded-full z-10 border-l border-gray-100" />
          </View>

          {/* Footer */}
          <View className="py-5 items-center flex-row justify-center bg-white">
            <Ionicons name="information-circle-outline" size={16} color="#9ca3af" />
            <Text className="text-gray-500 text-xs ml-1 font-medium">Please show this QR code at the counter</Text>
          </View>
        </View>

        {/* Buttons */}
        <TouchableOpacity className="bg-[#0f172a] rounded-2xl py-4 flex-row justify-center items-center mb-4 shadow-md">
          <Ionicons name="download-outline" size={20} color="white" className="mr-2" />
          <Text className="text-white font-bold text-sm ml-1">Download PDF Ticket</Text>
        </TouchableOpacity>

        <TouchableOpacity className="bg-white border border-[#0f172a] rounded-2xl py-4 flex-row justify-center items-center mb-6 shadow-sm">
          <Ionicons name="share-social-outline" size={20} color="#0f172a" className="mr-2" />
          <Text className="text-[#0f172a] font-bold text-sm ml-1">Share with Family</Text>
        </TouchableOpacity>

        {/* Traveller Tip */}
        <View className="bg-sky-50 rounded-2xl p-4 flex-row items-start mb-10 border border-sky-100">
          <View className="bg-[#0c4a6e] p-2 rounded-xl mr-3">
            <Ionicons name="bulb" size={16} color="#38bdf8" />
          </View>
          <View className="flex-1 pt-0.5">
            <Text className="text-[#0c4a6e] text-[10px] font-bold tracking-widest mb-1 uppercase">Travel Tip</Text>
            <Text className="text-gray-700 text-xs leading-relaxed pr-2">
              Arrive at the station 30 minutes early for verification. Have a safe journey!
            </Text>
          </View>
        </View>
        
        <View className="h-4" />
      </ScrollView>
    </SafeAreaView>
  );
}
