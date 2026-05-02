// import React, { useState, useEffect, useContext } from "react";
// import {
//   View,
//   Text,
//   SafeAreaView,
//   ScrollView,
//   TouchableOpacity,
//   ActivityIndicator,
//   Dimensions,
//   Platform,
// } from "react-native";
// import { Ionicons, MaterialCommunityIcons, Feather } from "@expo/vector-icons";
// import { router, useLocalSearchParams } from "expo-router";
// import dayjs from "dayjs";
// import { getSeatLayout, getScheduleById } from "../../api/schedules";
// import { useSocket } from "../../hooks/useSocket";
// import { BookingContext } from "../../context/BookingContext";
// import { UIContext } from "../../context/UIContext";

// const { width } = Dimensions.get("window");
// // Smaller seat size for better fit on mobile
// const SEAT_SIZE = Math.min(48, (width - 100) / 5); // max 48px, responsive
// const AISLE_WIDTH = SEAT_SIZE * 0.5;
// const ROW_LABEL_WIDTH = 24;

// export default function SeatSelection() {
//   const { scheduleId } = useLocalSearchParams();
//   const [seatLayout, setSeatLayout] = useState([]);
//   const [lockedSeats, setLockedSeats] = useState([]);
//   const [bookedSeats, setBookedSeats] = useState([]);
//   const [scheduleData, setScheduleData] = useState(null);
//   const [isLoading, setIsLoading] = useState(true);

//   const { socket } = useSocket(scheduleId);
//   const { showSnackbar } = useContext(UIContext);
//   const { selectedSeats, setSelectedSeats } = useContext(BookingContext);

//   // Fetch schedule and seat layout
//   useEffect(() => {
//     if (!scheduleId) return;

//     const fetchData = async () => {
//       try {
//         const scheduleRes = await getScheduleById(scheduleId);
//         setScheduleData(scheduleRes.data.data.schedule);

//         const layoutRes = await getSeatLayout(scheduleId);
//         const data = layoutRes.data.data;

//         let rawLayout = data.seat_layout;
//         if (Array.isArray(rawLayout) && rawLayout.length > 0) {
//           if (Array.isArray(rawLayout[0])) {
//             setSeatLayout(rawLayout);
//           } else {
//             // Convert flat array to rows of 4 seats each
//             const rows = [];
//             for (let i = 0; i < rawLayout.length; i += 4) {
//               rows.push(rawLayout.slice(i, i + 4));
//             }
//             setSeatLayout(rows);
//           }
//         } else {
//           // Fallback dummy layout
//           const dummySeats = Array.from({ length: 40 }, (_, i) => ({
//             id: (i + 1).toString(),
//             status: i % 7 === 0 ? "women" : "available",
//           }));
//           const rows = [];
//           for (let i = 0; i < dummySeats.length; i += 4) {
//             rows.push(dummySeats.slice(i, i + 4));
//           }
//           setSeatLayout(rows);
//         }

//         setLockedSeats(data.locked_seats || []);
//         setBookedSeats(data.booked_seats || []);
//       } catch (err) {
//         showSnackbar("Failed to load seat layout", "error");
//       } finally {
//         setIsLoading(false);
//       }
//     };

//     fetchData();

//     if (socket) {
//       const handleSeatsLocked = (data) => {
//         if (data.scheduleId == scheduleId) {
//           setLockedSeats((prev) => [...new Set([...prev, ...data.seats])]);
//         }
//       };
//       const handleSeatsBooked = (data) => {
//         if (data.scheduleId == scheduleId) {
//           setBookedSeats((prev) => [...new Set([...prev, ...data.seats])]);
//           setLockedSeats((prev) => prev.filter((s) => !data.seats.includes(s)));
//           setSelectedSeats((prev) => {
//             const newSelected = prev.filter((s) => !data.seats.includes(s));
//             if (newSelected.length < prev.length) {
//               showSnackbar("Some selected seats were just booked!", "warning");
//             }
//             return newSelected;
//           });
//         }
//       };
//       const handleSeatsReleased = (data) => {
//         if (data.scheduleId == scheduleId) {
//           setLockedSeats((prev) => prev.filter((s) => !data.seats.includes(s)));
//         }
//       };

//       socket.on("seats-locked", handleSeatsLocked);
//       socket.on("seats-booked", handleSeatsBooked);
//       socket.on("seats-released", handleSeatsReleased);

//       return () => {
//         socket.off("seats-locked", handleSeatsLocked);
//         socket.off("seats-booked", handleSeatsBooked);
//         socket.off("seats-released", handleSeatsReleased);
//       };
//     }
//   }, [scheduleId, socket]);

//   const toggleSeat = (seatId, isBooked, isLocked) => {
//     if (isBooked || isLocked) return;
//     if (selectedSeats.includes(seatId)) {
//       setSelectedSeats(selectedSeats.filter((id) => id !== seatId));
//       if (socket) socket.emit("release-seat", { scheduleId, seatId });
//     } else {
//       if (selectedSeats.length >= 4) {
//         showSnackbar("You can select up to 4 seats only", "warning");
//         return;
//       }
//       setSelectedSeats([...selectedSeats, seatId]);
//       if (socket) socket.emit("lock-seat", { scheduleId, seatId });
//     }
//   };

//   const getSeatStatus = (seat) => {
//     if (!seat) return "empty";
//     const isSelected = selectedSeats.includes(seat.id);
//     const isBooked = bookedSeats.includes(seat.id);
//     const isLocked = lockedSeats.includes(seat.id) && !isSelected;
//     if (isSelected) return "selected";
//     if (isBooked) return "booked";
//     if (isLocked) return "locked";
//     return seat.status === "women" ? "women" : "available";
//   };

//   const renderSeat = (seat, rowIdx, colIdx) => {
//     if (!seat) return <View key={`empty-${rowIdx}-${colIdx}`} style={{ width: SEAT_SIZE, margin: 3 }} />;

//     const status = getSeatStatus(seat);
//     let bgColor, borderColor, textColor;

//     switch (status) {
//       case "selected":
//         bgColor = "bg-[#ff8a4c]";
//         borderColor = "border-[#ff8a4c]";
//         textColor = "text-white";
//         break;
//       case "booked":
//       case "locked":
//         bgColor = "bg-gray-100";
//         borderColor = "border-gray-200";
//         textColor = "text-gray-400";
//         break;
//       case "women":
//         bgColor = "bg-pink-50";
//         borderColor = "border-pink-200";
//         textColor = "text-pink-600";
//         break;
//       default:
//         bgColor = "bg-white";
//         borderColor = "border-gray-300";
//         textColor = "text-gray-700";
//     }

//     const isDisabled = status === "booked" || status === "locked";

//     return (
//       <TouchableOpacity
//         key={seat.id}
//         activeOpacity={0.7}
//         disabled={isDisabled}
//         onPress={() => toggleSeat(seat.id, status === "booked", status === "locked")}
//         style={{ width: SEAT_SIZE, margin: 3 }}
//         className={`rounded-lg items-center justify-center py-1.5 ${bgColor} border ${borderColor}`}
//       >
//         <Text className={`text-xs font-semibold ${textColor}`}>{seat.id}</Text>
//         {status === "women" && !isDisabled && (
//           <View className="absolute top-0.5 right-0.5 w-1.5 h-1.5 rounded-full bg-pink-500" />
//         )}
//         {(status === "booked" || status === "locked") && (
//           <View className="absolute inset-0 items-center justify-center">
//             <View className="w-6 h-px bg-gray-400 rotate-45 absolute" />
//             <View className="w-6 h-px bg-gray-400 -rotate-45 absolute" />
//           </View>
//         )}
//       </TouchableOpacity>
//     );
//   };

//   const handleContinue = () => {
//     if (selectedSeats.length === 0) return;
//     router.push({
//       pathname: "/(customer)/passenger-details",
//       params: {
//         scheduleId: scheduleId,
//         seats: selectedSeats.join(","),
//         total: selectedSeats.length * (scheduleData?.base_price || 0),
//       },
//     });
//   };

//   if (isLoading) {
//     return (
//       <SafeAreaView className="flex-1 bg-[#f8fafc] justify-center items-center">
//         <ActivityIndicator size="large" color="#ff8a4c" />
//         <Text className="mt-4 text-gray-500 font-medium">Loading seat map...</Text>
//       </SafeAreaView>
//     );
//   }

//   const departure = dayjs(scheduleData?.departure_time);
//   const arrival = dayjs(scheduleData?.arrival_time);
//   const durationHours = scheduleData?.duration_minutes
//     ? Math.floor(scheduleData.duration_minutes / 60)
//     : arrival.diff(departure, "hour");

//   let amenities = [];
//   try {
//     amenities = scheduleData?.amenities ? JSON.parse(scheduleData.amenities) : [];
//   } catch (e) {
//     amenities = [];
//   }

//   const bottomBarHeight = Platform.OS === "ios" ? 130 : 110;

//   // Generate row labels (A, B, C, ...)
//   // const rowLabels = seatLayout.map((_, idx) => String.fromCharCode(65 + idx));

//   return (
//     <SafeAreaView style={{ flex: 1 }} className="flex-1 bg-[#f8fafc]">
//       {/* Scrollable content includes header and seat map */}
//       <ScrollView
//         className="flex-1"
//         showsVerticalScrollIndicator={false}
//         contentContainerStyle={{ paddingBottom: bottomBarHeight + 20 }}
//       >
//         {/* Header (now inside ScrollView) */}
//         <View className="bg-white px-5 pt-4 pb-3 border-b border-gray-100">
//           <View className="flex-row items-center justify-between">
//             <TouchableOpacity onPress={() => router.back()} className="p-1">
//               <Ionicons name="arrow-back" size={24} color="#1e293b" />
//             </TouchableOpacity>
//             <View className="flex-1 ml-3">
//               <Text className="text-lg font-bold text-gray-800">
//                 {scheduleData?.origin} → {scheduleData?.destination}
//               </Text>
//               <Text className="text-xs text-gray-500 mt-0.5">
//                 {scheduleData?.bus_number} • {scheduleData?.bus_type}
//               </Text>
//             </View>
//           </View>

//           {/* Journey details */}
//           <View className="flex-row justify-between mt-3 bg-gray-50 p-3 rounded-xl">
//             <View>
//               <Text className="text-[10px] font-bold text-gray-400 uppercase">Departure</Text>
//               <Text className="text-sm font-semibold text-gray-800">
//                 {departure.format("DD MMM, hh:mm A")}
//               </Text>
//               <Text className="text-xs text-gray-500">{departure.format("ddd")}</Text>
//             </View>
//             <View className="items-center">
//               <Text className="text-[10px] font-bold text-gray-400 uppercase">Duration</Text>
//               <View className="flex-row items-center">
//                 <Text className="text-sm font-semibold text-gray-800">{durationHours}h</Text>
//                 <Feather name="clock" size={12} color="#94a3b8" className="ml-1" />
//               </View>
//             </View>
//             <View className="items-end">
//               <Text className="text-[10px] font-bold text-gray-400 uppercase">Arrival</Text>
//               <Text className="text-sm font-semibold text-gray-800">
//                 {arrival.format("DD MMM, hh:mm A")}
//               </Text>
//               <Text className="text-xs text-gray-500">{arrival.format("ddd")}</Text>
//             </View>
//           </View>

//           {/* Amenities chips */}
//           {amenities.length > 0 && (
//             <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mt-3">
//               {amenities.map((item, idx) => (
//                 <View key={idx} className="bg-gray-100 rounded-full px-3 py-1 mr-2 flex-row items-center">
//                   {item.toLowerCase() === "ac" && <Ionicons name="snow-outline" size={12} color="#0284c7" />}
//                   {item.toLowerCase() === "wifi" && <Ionicons name="wifi-outline" size={12} color="#0284c7" />}
//                   {item.toLowerCase() === "tv" && <MaterialCommunityIcons name="television" size={12} color="#0284c7" />}
//                   <Text className="text-xs text-gray-600 ml-1">{item}</Text>
//                 </View>
//               ))}
//             </ScrollView>
//           )}
//         </View>

//         {/* Seat Map Card */}
//         <View className="px-4 pt-6">
//           <View className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
//             {/* Driver indicator */}
//             <View className="items-end mb-3">
//               <View className="bg-gray-100 p-2 rounded-lg w-12 items-center">
//                 <MaterialCommunityIcons name="steering" size={20} color="#64748b" />
//                 <Text className="text-[9px] text-gray-500 mt-0.5">Driver</Text>
//               </View>
//             </View>

//             {/* Seat Grid with row labels */}
//             {seatLayout.length === 0 ? (
//               <View className="py-20 items-center">
//                 <Text className="text-gray-400">No seat layout available</Text>
//               </View>
//             ) : (
//               seatLayout.map((row, rowIdx) => (
//                 <View key={rowIdx} className="flex-row items-center justify-center mb-1">
//                   {/* Row Label */}
//                   {/* <View style={{ width: ROW_LABEL_WIDTH }} className="items-center justify-center">
//                     <Text className="text-xs font-bold text-gray-400">{rowLabels[rowIdx]}</Text>
//                   </View> */}
//                   {/* Left seats (first 2) */}
//                   <View className="flex-row">
//                     {row.slice(0, 2).map((seat, colIdx) => renderSeat(seat, rowIdx, colIdx))}
//                   </View>
//                   {/* Aisle */}
//                   <View style={{ width: AISLE_WIDTH }} />
//                   {/* Right seats (last 2) */}
//                   <View className="flex-row">
//                     {row.slice(2, 4).map((seat, colIdx) => renderSeat(seat, rowIdx, colIdx + 2))}
//                   </View>
//                 </View>
//               ))
//             )}

//             {/* Legend */}
//             <View className="mt-5 pt-3 border-t border-gray-100">
//               <View className="flex-row flex-wrap justify-between">
//                 {[
//                   { label: "Available", bg: "bg-white", border: "border-gray-300" },
//                   { label: "Selected", bg: "bg-[#ff8a4c]", border: "border-[#ff8a4c]" },
//                   { label: "Booked/Locked", bg: "bg-gray-100", border: "border-gray-200", cross: true },
//                   { label: "Women-only", bg: "bg-pink-50", border: "border-pink-200", dot: true },
//                 ].map((item, idx) => (
//                   <View key={idx} className="flex-row items-center mr-3 mb-2">
//                     <View className={`w-5 h-5 rounded-md ${item.bg} border ${item.border} items-center justify-center`}>
//                       {item.cross && (
//                         <View className="w-3 h-px bg-gray-400 rotate-45 absolute" />
//                       )}
//                       {item.dot && <View className="w-1.5 h-1.5 rounded-full bg-pink-500 absolute top-0.5 right-0.5" />}
//                     </View>
//                     <Text className="text-[11px] text-gray-500 ml-1.5">{item.label}</Text>
//                   </View>
//                 ))}
//               </View>
//             </View>
//           </View>
//         </View>
//       </ScrollView>

//       {/* Fixed Bottom Bar */}
//       <View className="absolute bottom-0 left-0 right-0 bg-white border-t border-gray-100 pt-2 pb-5 px-5 shadow-2xl">
//         <View className="flex-row justify-between items-end mb-3">
//           <View>
//             <Text className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
//               Selected Seats
//             </Text>
//             <View className="flex-row mt-1 flex-wrap">
//               {selectedSeats.length > 0 ? (
//                 selectedSeats.map((seat) => (
//                   <View key={seat} className="bg-[#ff8a4c] rounded-md px-2 py-1 mr-1.5 mb-1">
//                     <Text className="text-white text-xs font-bold">{seat}</Text>
//                   </View>
//                 ))
//               ) : (
//                 <Text className="text-gray-400 text-xs">None</Text>
//               )}
//             </View>
//           </View>
//           <View className="items-end">
//             <Text className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
//               Total Fare
//             </Text>
//             <Text className="text-xl font-extrabold text-gray-800">
//               NPR {(selectedSeats.length * (scheduleData?.base_price || 0)).toLocaleString()}
//             </Text>
//             <Text className="text-[10px] text-gray-400">per seat: NPR {parseInt(scheduleData?.base_price || 0).toLocaleString()}</Text>
//           </View>
//         </View>

//         <TouchableOpacity
//           className={`rounded-full py-3 flex-row justify-center items-center shadow-sm ${
//             selectedSeats.length > 0 ? "bg-[#ff8a4c]" : "bg-gray-300"
//           }`}
//           disabled={selectedSeats.length === 0}
//           onPress={handleContinue}
//         >
//           <Text className="text-white text-base font-bold mr-2">Continue</Text>
//           <Ionicons name="arrow-forward" size={18} color="white" />
//         </TouchableOpacity>
//         <Text className="text-center text-[10px] text-gray-400 mt-1.5">
//           You can select up to 4 seats
//         </Text>
//       </View>
//     </SafeAreaView>
//   );
// }