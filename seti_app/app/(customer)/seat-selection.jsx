import React, { useState, useEffect, useContext } from "react";
import { View, Text, SafeAreaView, ScrollView, TouchableOpacity, ActivityIndicator } from "react-native";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import { getSeatLayout } from "../../api/schedules";
import { getScheduleById } from "../../api/schedules";
import { useSocket } from "../../hooks/useSocket";
import { BookingContext } from "../../context/BookingContext";
import { UIContext } from "../../context/UIContext";

export default function SeatSelection() {
  const { scheduleId } = useLocalSearchParams();
  const [selectedSeats, setSelectedSeats] = useState([]);
  const [seatLayout, setSeatLayout] = useState([]);
  const [lockedSeats, setLockedSeats] = useState([]);
  const [bookedSeats, setBookedSeats] = useState([]);
  const [scheduleData, setScheduleData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  // Initialize socket
  const { socket } = useSocket(scheduleId);
  const { showSnackbar } = useContext(UIContext);

  useEffect(() => {
    if (!scheduleId) return;
    
    const fetchData = async () => {
      try {
        const scheduleRes = await getScheduleById(scheduleId);
        setScheduleData(scheduleRes.data.data.schedule);

        const layoutRes = await getSeatLayout(scheduleId);
        const data = layoutRes.data.data;
        
        // Transform layout object/array into 2D grid if necessary
        // Assuming seat_layout is either a 2D array or we map it from 1D
        // If it's a 1D array of seat objects, we can construct rows
        const rawLayout = data.seat_layout;
        if (Array.isArray(rawLayout)) {
            setSeatLayout(rawLayout);
        }
        
        setLockedSeats(data.locked_seats || []);
        setBookedSeats(data.booked_seats || []);
      } catch (err) {
        showSnackbar('Failed to load seat layout', 'error');
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();

    // Set up socket event listeners for live updates if socket is available
    if (socket) {
      socket.on('seats-locked', (data) => {
        if (data.scheduleId == scheduleId) {
           setLockedSeats(prev => [...new Set([...prev, ...data.seats])]);
        }
      });
      socket.on('seats-booked', (data) => {
        if (data.scheduleId == scheduleId) {
           setBookedSeats(prev => [...new Set([...prev, ...data.seats])]);
           setLockedSeats(prev => prev.filter(s => !data.seats.includes(s)));
           // remove from selected if we are currently selecting it
           setSelectedSeats(prev => {
             const newSelected = prev.filter(s => !data.seats.includes(s));
             if (newSelected.length < prev.length) {
               showSnackbar('Some of your selected seats were just booked by someone else!', 'warning');
             }
             return newSelected;
           });
        }
      });
      socket.on('seats-released', (data) => {
        if (data.scheduleId == scheduleId) {
           setLockedSeats(prev => prev.filter(s => !data.seats.includes(s)));
        }
      });
    }

    return () => {
      if (socket) {
        socket.off('seats-locked');
        socket.off('seats-booked');
        socket.off('seats-released');
      }
    };
  }, [scheduleId, socket]);

  const toggleSeat = (seatId, isBooked, isLocked) => {
    if (isBooked || isLocked) return;
    
    if (selectedSeats.includes(seatId)) {
      setSelectedSeats(selectedSeats.filter((id) => id !== seatId));
      if (socket) socket.emit('release-seat', { scheduleId, seatId });
    } else {
      if (selectedSeats.length >= 4) {
        showSnackbar('You can only select up to 4 seats', 'warning');
        return;
      }
      setSelectedSeats([...selectedSeats, seatId]);
      if (socket) socket.emit('lock-seat', { scheduleId, seatId });
    }
  };

  const renderSeat = (seat) => {
    if (!seat) return <View className="w-[50px] h-[50px] m-1" />; // Empty space placeholder

    const isSelected = selectedSeats.includes(seat.id);
    const isBooked = bookedSeats.includes(seat.id);
    const isLocked = lockedSeats.includes(seat.id) && !isSelected;
    const isWomen = seat.status === "women";

    let containerStyle = "bg-[#f8fafc] border border-[#e2e8f0]";
    let textStyle = "text-gray-700";

    if (isSelected) {
      containerStyle = "bg-[#0f172a] border border-[#0f172a]";
      textStyle = "text-white font-bold";
    } else if (isBooked || isLocked) {
      containerStyle = "bg-[#f1f5f9] border border-transparent items-center justify-center relative";
      textStyle = "text-gray-400";
    }

    return (
      <TouchableOpacity
        key={seat.id}
        activeOpacity={0.7}
        disabled={isBooked || isLocked}
        onPress={() => toggleSeat(seat.id, isBooked, isLocked)}
        className={`w-[54px] h-[58px] rounded-xl items-center justify-center m-1.5 relative ${containerStyle}`}
      >
        <Text className={`text-sm ${textStyle}`}>{seat.id}</Text>
        
        {/* Booked Cross Overlay */}
        {(isBooked || isLocked) && (
          <View className="absolute inset-0 items-center justify-center pointer-events-none overflow-hidden rounded-xl opacity-40">
            <View className="w-[80px] h-[1px] bg-gray-500 rotate-45 absolute" />
            <View className="w-[80px] h-[1px] bg-gray-500 -rotate-45 absolute" />
          </View>
        )}

        {/* Women-only Dot */}
        {!isSelected && !isBooked && !isLocked && isWomen && (
          <View className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-pink-500" />
        )}
      </TouchableOpacity>
    );
  };

  const handleContinue = () => {
    if (selectedSeats.length === 0) return;
    router.push({
      pathname: "/(customer)/passenger-details",
      params: { 
        scheduleId: scheduleId, 
        seats: selectedSeats.join(","), 
        total: selectedSeats.length * (scheduleData?.base_price || 0) 
      }
    });
  };

  if (isLoading) {
    return (
      <SafeAreaView className="flex-1 bg-[#f8fafc] justify-center items-center">
        <ActivityIndicator size="large" color="#1e3a8a" />
        <Text className="mt-4 text-gray-500">Loading seat map...</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-[#f8fafc]">
      {/* Header */}
      <View className="flex-row items-center px-4 py-3 bg-white border-b border-gray-100 z-10">
        <TouchableOpacity onPress={() => router.back()} className="mr-3 p-1">
          <Ionicons name="arrow-back" size={24} color="#1e3a8a" />
        </TouchableOpacity>
        <View>
          <Text className="text-[#1e3a8a] text-xl font-bold tracking-tight">Select Seats</Text>
          <Text className="text-gray-500 text-xs">
            {scheduleData?.bus_number || 'Operator'} | {scheduleData?.bus_type?.toUpperCase() || 'AC Deluxe'}
          </Text>
        </View>
      </View>

      <ScrollView className="flex-1 px-4 pt-4 pb-32" showsVerticalScrollIndicator={false}>
        {/* Main Card */}
        <View className="bg-white rounded-[24px] shadow-sm border border-gray-100 p-4 mb-32">
          
          {/* Top Badges */}
          <View className="flex-row justify-between items-center mb-4">
            <View className="flex-row items-center">
              <MaterialCommunityIcons name="check-decagram" size={18} color="#1e3a8a" className="mr-1.5" />
              <Text className="text-[#1e3a8a] text-[10px] font-bold tracking-widest">VERIFIED OPERATOR</Text>
            </View>
            <View className="bg-[#cffafe] px-2.5 py-1 rounded-full flex-row items-center">
              <Ionicons name="snow-outline" size={12} color="#0284c7" className="mr-1" />
              <Text className="text-[#0284c7] text-[9px] font-bold tracking-widest">AIR CONDITIONED</Text>
            </View>
          </View>
          <View className="h-px bg-gray-100 w-full mb-6" />

          {/* Steering Wheel Icon */}
          <View className="items-end mb-4 pr-1">
            <View className="w-10 h-10 border border-gray-300 rounded-lg items-center justify-center">
              <MaterialCommunityIcons name="steering" size={24} color="#64748b" />
            </View>
          </View>

          {/* Seat Grid */}
          <View className="items-center mb-8">
            {seatLayout.length > 0 ? (
              seatLayout.map((row, rowIndex) => (
                <View key={rowIndex} className="flex-row justify-between w-full px-1 mb-1">
                  {/* Left Side */}
                  <View className="flex-row">
                    {renderSeat(row[0])}
                    {renderSeat(row[1])}
                  </View>
                  
                  {/* Aisle (Gap) */}
                  <View className="w-4" />
                  
                  {/* Right Side */}
                  <View className="flex-row">
                    {renderSeat(row[2])}
                    {renderSeat(row[3])}
                  </View>
                </View>
              ))
            ) : (
              <Text className="text-gray-400 my-10">No seat layout available</Text>
            )}
          </View>

          <View className="h-px bg-gray-100 w-full mb-6" />

          {/* Legend */}
          <View className="px-2">
            <View className="flex-row justify-between mb-4">
              <View className="flex-row items-center flex-1">
                <View className="w-5 h-5 rounded bg-[#f8fafc] border border-[#e2e8f0] mr-3" />
                <Text className="text-gray-500 text-sm">Available</Text>
              </View>
              <View className="flex-row items-center flex-1">
                <View className="w-5 h-5 rounded bg-[#0f172a] mr-3" />
                <Text className="text-gray-500 text-sm">Selected</Text>
              </View>
            </View>
            <View className="flex-row justify-between">
              <View className="flex-row items-center flex-1">
                <View className="w-5 h-5 rounded bg-[#f1f5f9] mr-3 items-center justify-center overflow-hidden">
                   <View className="w-8 h-[1px] bg-gray-300 rotate-45 absolute" />
                   <View className="w-8 h-[1px] bg-gray-300 -rotate-45 absolute" />
                </View>
                <Text className="text-gray-500 text-sm">Booked</Text>
              </View>
              <View className="flex-row items-center flex-1">
                <View className="w-5 h-5 rounded bg-[#f8fafc] border border-[#e2e8f0] mr-3 relative">
                  <View className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full bg-pink-500" />
                </View>
                <Text className="text-gray-500 text-sm">Women-only</Text>
              </View>
            </View>
          </View>

        </View>
      </ScrollView>

      {/* Fixed Bottom Action Bar */}
      <View className="absolute bottom-0 left-0 right-0 bg-white border-t border-gray-100 pt-4 pb-8 px-6 shadow-2xl z-20">
        <View className="flex-row justify-between items-end mb-4">
          <View>
            <Text className="text-gray-500 text-[10px] font-bold tracking-widest mb-1.5 uppercase">Selected Seats</Text>
            <View className="flex-row">
              {selectedSeats.length > 0 ? (
                selectedSeats.map(seat => (
                  <View key={seat} className="bg-[#0f172a] px-3 py-1.5 rounded-md mr-1.5">
                    <Text className="text-white text-xs font-semibold">{seat}</Text>
                  </View>
                ))
              ) : (
                <Text className="text-gray-400 text-sm py-1">None</Text>
              )}
            </View>
          </View>
          <View className="items-end">
            <Text className="text-gray-500 text-[10px] font-bold tracking-widest mb-1 uppercase">Total Fare</Text>
            <Text className="text-[#0f172a] text-2xl font-extrabold tracking-tight">NPR {(selectedSeats.length * (scheduleData?.base_price || 0)).toLocaleString()}</Text>
          </View>
        </View>
        
        <TouchableOpacity 
          className={`rounded-full py-4 flex-row justify-center items-center shadow-sm ${selectedSeats.length > 0 ? 'bg-[#ff8a4c]' : 'bg-gray-300'}`}
          disabled={selectedSeats.length === 0}
          onPress={handleContinue}
        >
          <Text className="text-white text-lg font-bold mr-2">Continue</Text>
          <Ionicons name="arrow-forward" size={20} color="white" />
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}
