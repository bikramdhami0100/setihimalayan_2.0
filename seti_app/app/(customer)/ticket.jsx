import React, { useEffect, useState } from "react";
import { View, Text, SafeAreaView, ScrollView, TouchableOpacity, ActivityIndicator, Alert, Platform } from "react-native";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import QRCode from "react-native-qrcode-svg";
import dayjs from "dayjs";
import { useBookings } from "../../hooks/useBookings";
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { downloadTicket } from '../../api/bookings';

export default function Ticket() {
  const { reference } = useLocalSearchParams();
  const { getBookingByReference, currentBooking, isLoading } = useBookings();
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    if (reference) {
      getBookingByReference(reference).finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, [reference]);

  if (loading || isLoading) {
    return (
      <SafeAreaView style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#0f172a" />
        <Text style={{ marginTop: 20 }}>Loading ticket...</Text>
      </SafeAreaView>
    );
  }

  if (!currentBooking) {
    return (
      <SafeAreaView style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 }}>
        <Text style={{ fontSize: 18, color: 'red', marginBottom: 20 }}>Ticket not found</Text>
        <TouchableOpacity onPress={() => router.back()} style={{ backgroundColor: '#0f172a', padding: 12, borderRadius: 12 }}>
          <Text style={{ color: 'white' }}>Go Back</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  const bookingRef = currentBooking.booking_reference;
  const origin = currentBooking.origin || "Kathmandu";
  const destination = currentBooking.destination || "Pokhara";
  const departureTime = currentBooking.departure_time ? dayjs(currentBooking.departure_time) : dayjs();
  const busType = currentBooking.bus_type || "Standard";
  const busNumber = currentBooking.bus_number || "N/A";
  const selectedSeats = currentBooking.selected_seats || [];
  const passengerDetails = currentBooking.passenger_details || [];
  const qrValue = JSON.stringify({ ref: bookingRef, seats: selectedSeats });
  const primaryPassenger = passengerDetails.length > 0 ? passengerDetails[0].name : "Valued Customer";
  const seatDisplay = selectedSeats.join(", ");

  // PDF download using downloadTicket API
 

const handleDownloadPDF = async () => {
  if (downloading) return;
  setDownloading(true);

  try {
    const response = await downloadTicket(bookingRef);
    const blob = response.data; // Blob object

    // Helper: web download using Blob
    const webDownload = () => {
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `ticket-${bookingRef}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      Alert.alert('Success', 'PDF downloaded');
    };

    // If on web OR if FileSystem is not available (directories missing), use web download
    if (Platform.OS === 'web' || (!FileSystem.documentDirectory && !FileSystem.cacheDirectory)) {
      webDownload();
    } else {
      // Native: save and share
      const base64 = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result.split(',')[1]);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });

      let directory = FileSystem.documentDirectory || FileSystem.cacheDirectory;
      if (!directory) throw new Error('No writable directory – please reinstall expo-file-system');

      const fileUri = directory + `ticket-${bookingRef}.pdf`;
      await FileSystem.writeAsStringAsync(fileUri, base64, { encoding: FileSystem.EncodingType.Base64 });

      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(fileUri);
      } else {
        Alert.alert('Success', `PDF saved to: ${fileUri}`);
      }
    }
  } catch (err) {
    console.error('Download error:', err);
    Alert.alert('Download Failed', err.message);
  } finally {
    setDownloading(false);
  }
};
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
              <QRCode value={qrValue} size={160} color="#0f172a" backgroundColor="white" />
            </View>
            <Text className="text-gray-500 text-[10px] font-bold tracking-widest">TICKET ID: {bookingRef}</Text>
          </View>

          {/* Details Grid */}
          <View className="px-6 pb-2">
            <View className="flex-row justify-between mb-5">
              <View className="flex-1">
                <Text className="text-gray-400 text-[9px] font-bold tracking-widest mb-1 uppercase">Passenger</Text>
                <Text className="text-gray-800 text-sm font-semibold">{primaryPassenger}</Text>
              </View>
              <View className="flex-1 items-start">
                <Text className="text-gray-400 text-[9px] font-bold tracking-widest mb-1 uppercase">Seat(s)</Text>
                <View className="flex-row items-center">
                  <MaterialCommunityIcons name="seat-passenger" size={14} color="#0284c7" />
                  <Text className="text-gray-800 text-sm font-semibold ml-1">{seatDisplay}</Text>
                </View>
              </View>
            </View>
            <View className="flex-row justify-between mb-6">
              <View className="flex-1">
                <Text className="text-gray-400 text-[9px] font-bold tracking-widest mb-1 uppercase">Bus Type</Text>
                <View className="flex-row items-center">
                  <Text className="text-gray-800 text-sm font-semibold mr-1">{busType}</Text>
                  <MaterialCommunityIcons name="check-decagram" size={12} color="#0ea5e9" />
                </View>
              </View>
              <View className="flex-1 items-start">
                <Text className="text-gray-400 text-[9px] font-bold tracking-widest mb-1 uppercase">Bus Plate</Text>
                <Text className="text-gray-800 text-sm font-semibold">{busNumber}</Text>
              </View>
            </View>
          </View>

          {/* Route Box */}
          <View className="bg-slate-50 mx-5 p-4 rounded-2xl flex-row items-center mb-5 border border-slate-100">
            <View className="flex-1 items-start">
              <Text className="text-gray-400 text-[9px] font-bold tracking-widest mb-1 uppercase">From</Text>
              <Text className="text-[#1e3a8a] text-lg font-bold">{origin}</Text>
              <Text className="text-gray-400 text-[10px]">Kalanki Stand</Text>
            </View>
            <View className="px-2 items-center justify-center relative">
              <View className="absolute w-12 h-px bg-gray-300 top-1/2 mt-1" />
              <View className="bg-slate-50 p-1 z-10">
                <Ionicons name="bus" size={20} color="#0284c7" />
              </View>
            </View>
            <View className="flex-1 items-end">
              <Text className="text-gray-400 text-[9px] font-bold tracking-widest mb-1 uppercase">To</Text>
              <Text className="text-[#1e3a8a] text-lg font-bold">{destination}</Text>
              <Text className="text-gray-400 text-[10px]">Prithvi Chowk</Text>
            </View>
          </View>

          {/* Date & Time */}
          <View className="flex-row justify-between px-6 pb-6">
            <View className="flex-row items-center">
              <Ionicons name="calendar-outline" size={16} color="#6b7280" />
              <View className="ml-2">
                <Text className="text-gray-400 text-[9px] font-bold tracking-widest mb-0.5 uppercase">Departure</Text>
                <Text className="text-gray-800 text-xs font-semibold">{departureTime.format('DD MMM YYYY')}</Text>
              </View>
            </View>
            <View className="flex-row items-center">
              <Ionicons name="time-outline" size={16} color="#6b7280" />
              <View className="ml-2">
                <Text className="text-gray-400 text-[9px] font-bold tracking-widest mb-0.5 uppercase">Boarding</Text>
                <Text className="text-gray-800 text-xs font-semibold">{departureTime.format('hh:mm A')}</Text>
              </View>
            </View>
          </View>

          {/* Cutouts & Dotted Line */}
          <View className="relative h-px flex-row items-center justify-center bg-white">
            <View className="absolute left-[-12px] w-6 h-6 bg-[#f8fafc] rounded-full z-10 border-r border-gray-100" />
            <View className="w-full border-t border-dashed border-gray-200" />
            <View className="absolute right-[-12px] w-6 h-6 bg-[#f8fafc] rounded-full z-10 border-l border-gray-100" />
          </View>

          <View className="py-5 items-center flex-row justify-center bg-white">
            <Ionicons name="information-circle-outline" size={16} color="#9ca3af" />
            <Text className="text-gray-500 text-xs ml-1 font-medium">Please show this QR code at the counter</Text>
          </View>
        </View>

        {/* Download Button */}
        <TouchableOpacity
          onPress={handleDownloadPDF}
          disabled={downloading}
          className="bg-[#0f172a] rounded-2xl py-4 flex-row justify-center items-center mb-4 shadow-md"
        >
          {downloading ? (
            <ActivityIndicator size="small" color="white" />
          ) : (
            <>
              <Ionicons name="download-outline" size={20} color="white" />
              <Text className="text-white font-bold text-sm ml-1">Download PDF Ticket</Text>
            </>
          )}
        </TouchableOpacity>

        <TouchableOpacity className="bg-white border border-[#0f172a] rounded-2xl py-4 flex-row justify-center items-center mb-6 shadow-sm">
          <Ionicons name="share-social-outline" size={20} color="#0f172a" />
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