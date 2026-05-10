import React, { useState, useEffect, useContext } from "react";
import {
  View,
  Text,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Dimensions,
  Platform,
} from "react-native";
import { Ionicons, MaterialCommunityIcons, Feather } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import dayjs from "dayjs";
import { getSeatLayout, getScheduleById } from "../../api/schedules";
import { useSocket } from "../../hooks/useSocket";
import { BookingContext } from "../../context/BookingContext";
import { UIContext } from "../../context/UIContext";

const { width } = Dimensions.get("window");
const SEAT_SIZE = Math.min(48, (width - 100) / 5);
const AISLE_WIDTH = SEAT_SIZE * 0.5;
const ROW_LABEL_WIDTH = 24;

export default function SeatSelection() {
  const { scheduleId } = useLocalSearchParams();
  const [seatLayout, setSeatLayout] = useState([]);
  const [lockedSeats, setLockedSeats] = useState([]);
  const [bookedSeats, setBookedSeats] = useState([]);
  const [scheduleData, setScheduleData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  const { socket } = useSocket(scheduleId);
  const { showSnackbar } = useContext(UIContext);
  const { selectedSeats, setSelectedSeats } = useContext(BookingContext);

  useEffect(() => {
    if (!scheduleId) return;

    const fetchData = async () => {
      try {
        const scheduleRes = await getScheduleById(scheduleId);
        setScheduleData(scheduleRes.data.data.schedule);

        const layoutRes = await getSeatLayout(scheduleId);
        const data = layoutRes.data.data;

        let rawLayout = data.seat_layout;
        if (Array.isArray(rawLayout) && rawLayout.length > 0) {
          if (Array.isArray(rawLayout[0])) {
            setSeatLayout(rawLayout);
          } else {
            const rows = [];
            for (let i = 0; i < rawLayout.length; i += 4) {
              rows.push(rawLayout.slice(i, i + 4));
            }
            setSeatLayout(rows);
          }
        } else {
          const dummySeats = Array.from({ length: 40 }, (_, i) => ({
            id: (i + 1).toString(),
            status: i % 7 === 0 ? "women" : "available",
          }));
          const rows = [];
          for (let i = 0; i < dummySeats.length; i += 4) {
            rows.push(dummySeats.slice(i, i + 4));
          }
          setSeatLayout(rows);
        }

        setLockedSeats(data.locked_seats || []);
        setBookedSeats(data.booked_seats || []);
      } catch (err) {
        showSnackbar("Failed to load seat layout", "error");
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();

    if (socket) {
      const handleSeatsLocked = (data) => {
        if (data.scheduleId == scheduleId) {
          setLockedSeats((prev) => [...new Set([...prev, ...data.seats])]);
        }
      };
      const handleSeatsBooked = (data) => {
        if (data.scheduleId == scheduleId) {
          setBookedSeats((prev) => [...new Set([...prev, ...data.seats])]);
          setLockedSeats((prev) => prev.filter((s) => !data.seats.includes(s)));
          setSelectedSeats((prev) => {
            const newSelected = prev.filter((s) => !data.seats.includes(s));
            if (newSelected.length < prev.length) {
              showSnackbar("Some selected seats were just booked!", "warning");
            }
            return newSelected;
          });
        }
      };
      const handleSeatsReleased = (data) => {
        if (data.scheduleId == scheduleId) {
          setLockedSeats((prev) => prev.filter((s) => !data.seats.includes(s)));
        }
      };

      socket.on("seats-locked", handleSeatsLocked);
      socket.on("seats-booked", handleSeatsBooked);
      socket.on("seats-released", handleSeatsReleased);

      return () => {
        socket.off("seats-locked", handleSeatsLocked);
        socket.off("seats-booked", handleSeatsBooked);
        socket.off("seats-released", handleSeatsReleased);
      };
    }
  }, [scheduleId, socket]);

  const toggleSeat = (seatId, isBooked, isLocked) => {
    if (isBooked || isLocked) return;
    if (selectedSeats.includes(seatId)) {
      setSelectedSeats(selectedSeats.filter((id) => id !== seatId));
      if (socket) socket.emit("release-seat", { scheduleId, seatId });
    } else {
      if (selectedSeats.length >= 4) {
        showSnackbar("You can select up to 4 seats only", "warning");
        return;
      }
      setSelectedSeats([...selectedSeats, seatId]);
      if (socket) socket.emit("lock-seat", { scheduleId, seatId });
    }
  };

  const getSeatStatus = (seat) => {
    if (!seat) return "empty";
    const isSelected = selectedSeats.includes(seat.id);
    const isBooked = bookedSeats.includes(seat.id);
    const isLocked = lockedSeats.includes(seat.id) && !isSelected;
    if (isSelected) return "selected";
    if (isBooked) return "booked";
    if (isLocked) return "locked";
    return seat.status === "women" ? "women" : "available";
  };

  const renderSeat = (seat, rowIdx, colIdx) => {
    if (!seat) return <View key={`empty-${rowIdx}-${colIdx}`} style={{ width: SEAT_SIZE, margin: 3 }} />;

    const status = getSeatStatus(seat);
    let bgColor, borderColor, textColor;

    switch (status) {
      case "selected":
        bgColor = "#ff8a4c";
        borderColor = "#ff8a4c";
        textColor = "#fff";
        break;
      case "booked":
      case "locked":
        bgColor = "#f1f5f9";
        borderColor = "#e2e8f0";
        textColor = "#94a3b8";
        break;
      case "women":
        bgColor = "#fdf2f8";
        borderColor = "#fbcfe8";
        textColor = "#db2777";
        break;
      default:
        bgColor = "#fff";
        borderColor = "#cbd5e1";
        textColor = "#475569";
    }

    const isDisabled = status === "booked" || status === "locked";

    return (
      <TouchableOpacity
        key={seat.id}
        activeOpacity={0.7}
        disabled={isDisabled}
        onPress={() => toggleSeat(seat.id, status === "booked", status === "locked")}
        style={{ width: SEAT_SIZE, margin: 3, borderRadius: 12, alignItems: "center", justifyContent: "center", paddingVertical: 6, backgroundColor: bgColor, borderWidth: 1, borderColor: borderColor }}
      >
        <Text style={{ fontSize: 12, fontWeight: "600", color: textColor }}>{seat.id}</Text>
        {status === "women" && !isDisabled && (
          <View style={{ position: "absolute", top: 2, right: 2, width: 6, height: 6, borderRadius: 3, backgroundColor: "#db2777" }} />
        )}
        {(status === "booked" || status === "locked") && (
          <View style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, alignItems: "center", justifyContent: "center" }}>
            <View style={{ width: 24, height: 1, backgroundColor: "#94a3b8", position: "absolute", transform: [{ rotate: "45deg" }] }} />
            <View style={{ width: 24, height: 1, backgroundColor: "#94a3b8", position: "absolute", transform: [{ rotate: "-45deg" }] }} />
          </View>
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
        total: selectedSeats.length * (scheduleData?.base_price || 0),
      },
    });
  };

  if (isLoading) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: "#f8fafc", justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator size="large" color="#ff8a4c" />
        <Text style={{ marginTop: 16, color: "#64748b", fontWeight: "500" }}>Loading seat map...</Text>
      </SafeAreaView>
    );
  }

  const departure = dayjs(scheduleData?.departure_time);
  const arrival = dayjs(scheduleData?.arrival_time);
  const durationHours = scheduleData?.duration_minutes
    ? Math.floor(scheduleData.duration_minutes / 60)
    : arrival.diff(departure, "hour");

  let amenities = [];
  try {
    amenities = scheduleData?.amenities ? JSON.parse(scheduleData.amenities) : [];
  } catch (e) {
    amenities = [];
  }

  const bottomBarHeight = Platform.OS === "ios" ? 130 : 110;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#f8fafc" }}>
      <ScrollView
        style={{ flex: 1 }}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: bottomBarHeight + 20 }}
      >
        <View style={{ backgroundColor: "#fff", paddingHorizontal: 20, paddingTop: 16, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: "#f1f5f9" }}>
          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
            <TouchableOpacity onPress={() => router.back()} style={{ padding: 4 }}>
              <Ionicons name="arrow-back" size={24} color="#1e293b" />
            </TouchableOpacity>
            <View style={{ flex: 1, marginLeft: 12 }}>
              <Text style={{ fontSize: 16, fontWeight: "700", color: "#1E293B" }}>
                {scheduleData?.origin} → {scheduleData?.destination}
              </Text>
              <Text style={{ fontSize: 12, color: "#64748b", marginTop: 2 }}>
                {scheduleData?.bus_number} • {scheduleData?.bus_type}
              </Text>
            </View>
          </View>

          <View style={{ flexDirection: "row", justifyContent: "space-between", marginTop: 12, backgroundColor: "#F8FAFC", padding: 12, borderRadius: 14 }}>
            <View>
              <Text style={{ fontSize: 10, fontWeight: "700", color: "#94a3b8", textTransform: "uppercase" }}>Departure</Text>
              <Text style={{ fontSize: 14, fontWeight: "600", color: "#1E293B" }}>
                {departure.format("DD MMM, hh:mm A")}
              </Text>
              <Text style={{ fontSize: 12, color: "#64748b" }}>{departure.format("ddd")}</Text>
            </View>
            <View style={{ alignItems: "center" }}>
              <Text style={{ fontSize: 10, fontWeight: "700", color: "#94a3b8", textTransform: "uppercase" }}>Duration</Text>
              <View style={{ flexDirection: "row", alignItems: "center" }}>
                <Text style={{ fontSize: 14, fontWeight: "600", color: "#1E293B" }}>{durationHours}h</Text>
                <Feather name="clock" size={12} color="#94a3b8" style={{ marginLeft: 4 }} />
              </View>
            </View>
            <View style={{ alignItems: "flex-end" }}>
              <Text style={{ fontSize: 10, fontWeight: "700", color: "#94a3b8", textTransform: "uppercase" }}>Arrival</Text>
              <Text style={{ fontSize: 14, fontWeight: "600", color: "#1E293B" }}>
                {arrival.format("DD MMM, hh:mm A")}
              </Text>
              <Text style={{ fontSize: 12, color: "#64748b" }}>{arrival.format("ddd")}</Text>
            </View>
          </View>

          {amenities.length > 0 && (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 12 }}>
              {amenities.map((item, idx) => (
                <View key={idx} style={{ backgroundColor: "#F1F5F9", borderRadius: 9999, paddingHorizontal: 12, paddingVertical: 4, marginRight: 8, flexDirection: "row", alignItems: "center" }}>
                  {item.toLowerCase() === "ac" && <Ionicons name="snow-outline" size={12} color="#0284c7" />}
                  {item.toLowerCase() === "wifi" && <Ionicons name="wifi-outline" size={12} color="#0284c7" />}
                  {item.toLowerCase() === "tv" && <MaterialCommunityIcons name="television" size={12} color="#0284c7" />}
                  <Text style={{ fontSize: 12, color: "#475569", marginLeft: 4 }}>{item}</Text>
                </View>
              ))}
            </ScrollView>
          )}
        </View>

        <View style={{ paddingHorizontal: 16, paddingTop: 24 }}>
          <View style={{ backgroundColor: "#fff", borderRadius: 16, elevation: 1, shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 2, borderWidth: 1, borderColor: "#f1f5f9", padding: 16 }}>
            <View style={{ alignItems: "flex-end", marginBottom: 12 }}>
              <View style={{ backgroundColor: "#F1F5F9", padding: 8, borderRadius: 12, width: 48, alignItems: "center" }}>
                <MaterialCommunityIcons name="steering" size={20} color="#64748b" />
                <Text style={{ fontSize: 9, color: "#64748b", marginTop: 2 }}>Driver</Text>
              </View>
            </View>

            {seatLayout.length === 0 ? (
              <View style={{ paddingVertical: 80, alignItems: "center" }}>
                <Text style={{ color: "#94a3b8" }}>No seat layout available</Text>
              </View>
            ) : (
              seatLayout.map((row, rowIdx) => (
                <View key={rowIdx} style={{ flexDirection: "row", alignItems: "center", justifyContent: "center", marginBottom: 4 }}>
                  <View style={{ flexDirection: "row" }}>
                    {row.slice(0, 2).map((seat, colIdx) => renderSeat(seat, rowIdx, colIdx))}
                  </View>
                  <View style={{ width: AISLE_WIDTH }} />
                  <View style={{ flexDirection: "row" }}>
                    {row.slice(2, 4).map((seat, colIdx) => renderSeat(seat, rowIdx, colIdx + 2))}
                  </View>
                </View>
              ))
            )}

            <View style={{ marginTop: 20, paddingTop: 12, borderTopWidth: 1, borderTopColor: "#f1f5f9" }}>
              <View style={{ flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between" }}>
                {[
                  { label: "Available", bg: "#fff", border: "#cbd5e1" },
                  { label: "Selected", bg: "#ff8a4c", border: "#ff8a4c" },
                  { label: "Booked/Locked", bg: "#f1f5f9", border: "#e2e8f0", cross: true },
                  { label: "Women-only", bg: "#fdf2f8", border: "#fbcfe8", dot: true },
                ].map((item, idx) => (
                  <View key={idx} style={{ flexDirection: "row", alignItems: "center", marginRight: 12, marginBottom: 8 }}>
                    <View style={{ width: 20, height: 20, borderRadius: 6, backgroundColor: item.bg, borderWidth: 1, borderColor: item.border, alignItems: "center", justifyContent: "center" }}>
                      {item.cross && (
                        <View style={{ width: 12, height: 1, backgroundColor: "#94a3b8", position: "absolute", transform: [{ rotate: "45deg" }] }} />
                      )}
                      {item.dot && <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: "#db2777", position: "absolute", top: 2, right: 2 }} />}
                    </View>
                    <Text style={{ fontSize: 11, color: "#64748b", marginLeft: 6 }}>{item.label}</Text>
                  </View>
                ))}
              </View>
            </View>
          </View>
        </View>
      </ScrollView>

      <View style={{ position: "absolute", bottom: 0, left: 0, right: 0, backgroundColor: "#fff", borderTopWidth: 1, borderTopColor: "#f1f5f9", paddingTop: 8, paddingBottom: 20, paddingHorizontal: 20, elevation: 10, shadowColor: "#000", shadowOffset: { width: 0, height: -4 }, shadowOpacity: 0.1, shadowRadius: 12 }}>
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 12 }}>
          <View>
            <Text style={{ fontSize: 10, fontWeight: "700", color: "#94a3b8", textTransform: "uppercase", letterSpacing: 1 }}>
              Selected Seats
            </Text>
            <View style={{ flexDirection: "row", marginTop: 4, flexWrap: "wrap" }}>
              {selectedSeats.length > 0 ? (
                selectedSeats.map((seat) => (
                  <View key={seat} style={{ backgroundColor: "#ff8a4c", borderRadius: 6, paddingHorizontal: 8, paddingVertical: 4, marginRight: 6, marginBottom: 4 }}>
                    <Text style={{ color: "#fff", fontSize: 12, fontWeight: "700" }}>{seat}</Text>
                  </View>
                ))
              ) : (
                <Text style={{ color: "#94a3b8", fontSize: 12 }}>None</Text>
              )}
            </View>
          </View>
          <View style={{ alignItems: "flex-end" }}>
            <Text style={{ fontSize: 10, fontWeight: "700", color: "#94a3b8", textTransform: "uppercase", letterSpacing: 1 }}>
              Total Fare
            </Text>
            <Text style={{ fontSize: 20, fontWeight: "800", color: "#1E293B" }}>
              NPR {(selectedSeats.length * (scheduleData?.base_price || 0)).toLocaleString()}
            </Text>
            <Text style={{ fontSize: 10, color: "#94a3b8" }}>per seat: NPR {parseInt(scheduleData?.base_price || 0).toLocaleString()}</Text>
          </View>
        </View>

        <TouchableOpacity
          style={{
            borderRadius: 9999,
            paddingVertical: 12,
            flexDirection: "row",
            justifyContent: "center",
            alignItems: "center",
            elevation: 1,
            shadowColor: "#000",
            shadowOffset: { width: 0, height: 1 },
            shadowOpacity: 0.05,
            shadowRadius: 2,
            backgroundColor: selectedSeats.length > 0 ? "#ff8a4c" : "#d1d5db",
          }}
          disabled={selectedSeats.length === 0}
          onPress={handleContinue}
        >
          <Text style={{ color: "#fff", fontSize: 14, fontWeight: "700", marginRight: 8 }}>Continue</Text>
          <Ionicons name="arrow-forward" size={18} color="white" />
        </TouchableOpacity>
        <Text style={{ textAlign: "center", fontSize: 10, color: "#94a3b8", marginTop: 6 }}>
          You can select up to 4 seats
        </Text>
      </View>
    </SafeAreaView>
  );
}
