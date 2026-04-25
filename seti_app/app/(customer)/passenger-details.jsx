import React, { useState } from "react";
import { View, Text, SafeAreaView, ScrollView, TouchableOpacity, TextInput, ActivityIndicator, KeyboardAvoidingView, Platform } from "react-native";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import { useBookings } from "../../hooks/useBookings";
import { Snackbar } from 'react-native-paper';

export default function PassengerDetails() {
  const { scheduleId, seats = "", total = "0" } = useLocalSearchParams();
  const selectedSeats = seats ? seats.split(",") : [];

  const { initiateBooking, isLoading } = useBookings();
  const [visible, setVisible] = useState(false);
  const [message, setMessage] = useState("");

  const [passengers, setPassengers] = useState(
    selectedSeats.map(seat => ({ seat, name: '', age: '', gender: 'Male' }))
  );

  const updatePassenger = (index, field, value) => {
    const newPassengers = [...passengers];
    newPassengers[index][field] = value;
    setPassengers(newPassengers);
  };

  const handleProceed = async () => {
    // Basic validation
    const missingInfo = passengers.some(p => !p.name.trim() || !p.age.trim());
    if (missingInfo) {
      setMessage("Please fill all passenger details");
      setVisible(true);
      return;
    }

    const details = passengers.map(p => ({
        seat_number: p.seat,
        name: p.name.trim(),
        age: parseInt(p.age) || 25,
        gender: p.gender
    }));
    
    try {
      const result = await initiateBooking(scheduleId, selectedSeats, details, "");
      if (result.success) {
        router.push({ 
          pathname: "/(customer)/payment", 
          params: { 
            bookingId: result.booking._id,
            amount: result.booking.total_amount,
            reference: result.booking.reference_number
          } 
        });
      } else {
        setMessage(result.error || "Booking failed. Please try again.");
        setVisible(true);
      }
    } catch (err) {
      setMessage("An unexpected error occurred");
      setVisible(true);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-[#f8fafc]">
      <KeyboardAvoidingView 
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
      >
        <View className="flex-row items-center justify-between px-4 py-3 bg-white border-b border-gray-100">
          <View className="flex-row items-center">
            <TouchableOpacity onPress={() => router.back()} className="mr-3">
              <Ionicons name="arrow-back" size={24} color="#0f172a" />
            </TouchableOpacity>
            <Text className="text-[#0f172a] text-lg font-bold">Traveler Details</Text>
          </View>
          <View className="bg-sky-50 px-3 py-1 rounded-full">
            <Text className="text-sky-600 text-[10px] font-black">{selectedSeats.length} {selectedSeats.length > 1 ? 'Seats' : 'Seat'}</Text>
          </View>
        </View>

        <ScrollView className="flex-1 px-4 pt-4" showsVerticalScrollIndicator={false}>
          <View className="mb-6">
            <Text className="text-[#0f172a] text-2xl font-black mb-1">Who's Travelling?</Text>
            <Text className="text-gray-500 text-sm font-medium">Please enter details exactly as they appear on ID.</Text>
          </View>

          {passengers.map((passenger, index) => (
            <View key={passenger.seat} className="bg-white rounded-3xl shadow-sm border border-gray-100 mb-6 p-6">
              <View className="flex-row justify-between items-center mb-6">
                <View className="flex-row items-center">
                  <View className="w-8 h-8 bg-[#0f172a] rounded-xl items-center justify-center mr-3">
                    <Text className="text-white font-bold text-xs">{index + 1}</Text>
                  </View>
                  <Text className="text-[#0f172a] text-base font-black">Seat {passenger.seat}</Text>
                </View>
                {index === 0 && (
                  <Text className="text-gray-400 text-[10px] font-bold uppercase tracking-widest">Primary Passenger</Text>
                )}
              </View>

              <View className="mb-5">
                <Text className="text-gray-400 text-[10px] font-black tracking-widest mb-2 uppercase">Full Name</Text>
                <View className="bg-[#f8fafc] rounded-2xl border border-gray-100 px-4 py-4">
                  <TextInput 
                    className="text-base text-[#0f172a] font-semibold"
                    placeholder="e.g. Biraj Bhatta"
                    placeholderTextColor="#94a3b8"
                    value={passenger.name}
                    onChangeText={(text) => updatePassenger(index, 'name', text)}
                  />
                </View>
              </View>

              <View className="flex-row gap-4">
                <View className="flex-1">
                  <Text className="text-gray-400 text-[10px] font-black tracking-widest mb-2 uppercase">Age</Text>
                  <View className="bg-[#f8fafc] rounded-2xl border border-gray-100 px-4 py-4">
                    <TextInput 
                      className="text-base text-[#0f172a] font-semibold"
                      placeholder="Age"
                      placeholderTextColor="#94a3b8"
                      keyboardType="numeric"
                      maxLength={3}
                      value={passenger.age}
                      onChangeText={(text) => updatePassenger(index, 'age', text)}
                    />
                  </View>
                </View>

                <View className="flex-[1.5]">
                  <Text className="text-gray-400 text-[10px] font-black tracking-widest mb-2 uppercase">Gender</Text>
                  <View className="bg-[#f8fafc] rounded-2xl border border-gray-100 p-1 flex-row">
                    {['Male', 'Female'].map(g => (
                      <TouchableOpacity 
                        key={g}
                        className={`flex-1 py-3 rounded-xl items-center ${passenger.gender === g ? 'bg-white shadow-sm' : ''}`}
                        onPress={() => updatePassenger(index, 'gender', g)}
                      >
                        <Text className={`text-xs font-bold ${passenger.gender === g ? 'text-[#0f172a]' : 'text-gray-400'}`}>{g}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              </View>
            </View>
          ))}

          <View className="bg-white rounded-3xl shadow-sm border border-gray-100 mb-8 p-6">
            <View className="flex-row items-center mb-6">
              <View className="w-8 h-8 bg-sky-100 rounded-xl items-center justify-center mr-3">
                <Ionicons name="mail" size={16} color="#0284c7" />
              </View>
              <Text className="text-[#0f172a] text-base font-black">Contact Information</Text>
            </View>

            <View className="mb-5">
              <Text className="text-gray-400 text-[10px] font-black tracking-widest mb-2 uppercase">Email Address</Text>
              <View className="bg-[#f8fafc] rounded-2xl border border-gray-100 px-4 py-4">
                <TextInput 
                  className="text-base text-[#0f172a] font-semibold"
                  placeholder="traveler@example.com"
                  placeholderTextColor="#94a3b8"
                  keyboardType="email-address"
                />
              </View>
            </View>

            <View>
              <Text className="text-gray-400 text-[10px] font-black tracking-widest mb-2 uppercase">Mobile Number</Text>
              <View className="flex-row gap-3">
                <View className="bg-[#f8fafc] rounded-2xl border border-gray-100 px-4 py-4">
                  <Text className="text-[#0f172a] font-black">+977</Text>
                </View>
                <View className="flex-1 bg-[#f8fafc] rounded-2xl border border-gray-100 px-4 py-4">
                  <TextInput 
                    className="flex-1 text-base text-[#0f172a] font-semibold tracking-widest"
                    placeholder="98XXXXXXXX"
                    placeholderTextColor="#94a3b8"
                    keyboardType="phone-pad"
                  />
                </View>
              </View>
            </View>
          </View>

          <View className="h-24" />
        </ScrollView>

        <View className="absolute bottom-0 left-0 right-0 bg-white border-t border-gray-100 px-6 py-4 flex-row justify-between items-center pb-8 shadow-2xl shadow-black">
          <View>
            <Text className="text-gray-400 text-[10px] font-black tracking-widest uppercase mb-1">Total Pay</Text>
            <Text className="text-[#0f172a] text-2xl font-black">NPR {total}</Text>
          </View>
          
          <TouchableOpacity 
            className="bg-[#0f172a] rounded-2xl py-4 px-8 shadow-lg shadow-slate-300"
            onPress={handleProceed}
            disabled={isLoading}
          >
            {isLoading ? (
                <ActivityIndicator color="white" />
            ) : (
                <View className="flex-row items-center">
                  <Text className="text-white font-bold text-base mr-2">Book Now</Text>
                  <Ionicons name="arrow-forward" size={18} color="white" />
                </View>
            )}
          </TouchableOpacity>
        </View>

        <Snackbar
          visible={visible}
          onDismiss={() => setVisible(false)}
          action={{
            label: 'OK',
            onPress: () => setVisible(false),
          }}
          style={{ backgroundColor: '#1e293b', borderRadius: 12, marginBottom: 100 }}
        >
          {message}
        </Snackbar>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
