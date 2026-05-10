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
  StatusBar,
  StyleSheet,
} from "react-native";
import { Ionicons, MaterialCommunityIcons, Feather } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import Animated, { FadeInUp } from "react-native-reanimated";
import dayjs from "dayjs";
import { getSeatLayout, getScheduleById } from "../../api/schedules";
import { useSocket } from "../../hooks/useSocket";
import { BookingContext } from "../../context/BookingContext";
import { UIContext } from "../../context/UIContext";

const { width } = Dimensions.get("window");
const SEAT_SIZE = Math.min(48, (width - 120) / 5);
const AISLE_WIDTH = SEAT_SIZE * 0.5;

const transformSeatIds = (layoutRows) => {
  const leftCols = 2;
  const rightCols = 2;
  const rows = layoutRows.length;
  const oldToNew = {};
  let aCounter = 1;
  let bCounter = 1;

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < leftCols; c++) {
      const oldId = r * (leftCols + rightCols) + c + 1;
      oldToNew[oldId] = `A${aCounter++}`;
    }
    for (let c = leftCols; c < leftCols + rightCols; c++) {
      const oldId = r * (leftCols + rightCols) + c + 1;
      oldToNew[oldId] = `B${bCounter++}`;
    }
  }

  const newLayout = layoutRows.map((row) =>
    row.map((seat) => {
      if (seat && seat.id) {
        const oldId = Number(seat.id);
        if (!isNaN(oldId) && oldToNew[oldId]) {
          return { ...seat, id: oldToNew[oldId] };
        }
      }
      return seat;
    })
  );

  return { newLayout, oldToNew };
};

const transformSeatIdArray = (idArray, oldToNew) => {
  return idArray.map((id) => {
    const numeric = Number(id);
    return oldToNew[numeric] || id;
  });
};

const amenityIcons = {
  ac: { icon: "snow-outline", lib: Ionicons },
  wifi: { icon: "wifi-outline", lib: Ionicons },
  tv: { icon: "television", lib: MaterialCommunityIcons },
  reclining: { icon: "bed-outline", lib: Ionicons },
  charging: { icon: "flash-outline", lib: Ionicons },
  blanket: { icon: "layers-outline", lib: Ionicons },
  water: { icon: "water-outline", lib: Ionicons },
  snack: { icon: "fast-food-outline", lib: Ionicons },
};

const getAmenityIcon = (amenity) => {
  const key = amenity.toLowerCase().replace(/\s+/g, "");
  const match = amenityIcons[key];
  if (match) return match;
  const generic = amenityIcons[Object.keys(amenityIcons).find((k) => key.includes(k))];
  if (generic) return generic;
  return { icon: "star-outline", lib: Ionicons };
};

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
        let seatRows = [];

        if (Array.isArray(rawLayout) && rawLayout.length > 0) {
          if (Array.isArray(rawLayout[0])) {
            seatRows = rawLayout;
          } else {
            const rows = [];
            for (let i = 0; i < rawLayout.length; i += 4) {
              rows.push(rawLayout.slice(i, i + 4));
            }
            seatRows = rows;
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
          seatRows = rows;
        }

        if (seatRows.length > 0) {
          const { newLayout, oldToNew } = transformSeatIds(seatRows);
          setSeatLayout(newLayout);

          const lockedRaw = data.locked_seats || [];
          const bookedRaw = data.booked_seats || [];
          setLockedSeats(transformSeatIdArray(lockedRaw, oldToNew));
          setBookedSeats(transformSeatIdArray(bookedRaw, oldToNew));
        } else {
          setSeatLayout([]);
          setLockedSeats([]);
          setBookedSeats([]);
        }
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
    if (!seat)
      return <View key={`empty-${rowIdx}-${colIdx}`} style={{ width: SEAT_SIZE, margin: 3 }} />;

    const status = getSeatStatus(seat);
    const isDisabled = status === "booked" || status === "locked";

    const seatStyles = {
      empty: { bg: "#fff", border: "#e2e8f0", text: "#475569" },
      available: { bg: "#fff", border: "#cbd5e1", text: "#475569" },
      selected: { bg: "#ff8a4c", border: "#ff8a4c", text: "#fff" },
      booked: { bg: "#f1f5f9", border: "#e2e8f0", text: "#94a3b8" },
      locked: { bg: "#fef2f2", border: "#fecaca", text: "#ef4444" },
      women: { bg: "#fdf2f8", border: "#fbcfe8", text: "#db2777" },
    };

    const s = seatStyles[status] || seatStyles.available;

    return (
      <TouchableOpacity
        key={seat.id}
        activeOpacity={0.7}
        disabled={isDisabled}
        onPress={() => toggleSeat(seat.id, status === "booked", status === "locked")}
        style={[styles.seat, { width: SEAT_SIZE, backgroundColor: s.bg, borderColor: s.border }]}
      >
        {status === "booked" || status === "locked" ? (
          <View style={styles.seatCross}>
            <View style={[styles.crossLine, { transform: [{ rotate: "45deg" }] }]} />
            <View style={[styles.crossLine, { transform: [{ rotate: "-45deg" }] }]} />
          </View>
        ) : status === "women" ? (
          <View style={styles.womenDot} />
        ) : null}
        <Text style={[styles.seatLabel, { color: s.text }]}>{seat.id}</Text>
        {status === "selected" && (
          <View style={styles.selectedCheck}>
            <Ionicons name="checkmark" size={8} color="#fff" />
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
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor="#1e3a8a" />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#ff8a4c" />
          <Text style={styles.loadingText}>Loading seat map...</Text>
        </View>
      </SafeAreaView>
    );
  }

  const departure = dayjs(scheduleData?.departure_time);
  const arrival = dayjs(scheduleData?.arrival_time);
  const durationHours = scheduleData?.duration_minutes
    ? Math.floor(scheduleData.duration_minutes / 60)
    : arrival.diff(departure, "hour");
  const durationMinutes = scheduleData?.duration_minutes
    ? scheduleData.duration_minutes % 60
    : 0;

  let amenities = [];
  try {
    amenities = scheduleData?.amenities ? JSON.parse(scheduleData.amenities) : [];
  } catch (e) {
    amenities = [];
  }

  const totalFare = selectedSeats.length * (scheduleData?.base_price || 0);
  const bottomBarHeight = Platform.OS === "ios" ? 140 : 120;

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#1e3a8a" />

      <View style={styles.topCircle} />

      <ScrollView
        showsVerticalScrollIndicator={false}
        bounces={false}
        contentContainerStyle={{ paddingBottom: bottomBarHeight + 20 }}
      >
        <Animated.View entering={FadeInUp.duration(800).delay(100)} style={styles.header}>
          <View style={styles.headerTop}>
            <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
              <Ionicons name="arrow-back" size={22} color="#1e3a8a" />
            </TouchableOpacity>
            <View style={{ flex: 1, marginLeft: 12 }}>
              <Text style={styles.brandText}>SETI HIMALAYAN</Text>
              <Text style={styles.headerTitle}>Select Your Seats</Text>
            </View>
            <TouchableOpacity style={styles.helpBtn}>
              <Ionicons name="help-circle-outline" size={22} color="#1e3a8a" />
            </TouchableOpacity>
          </View>
        </Animated.View>

        <Animated.View entering={FadeInUp.duration(800).delay(200)} style={styles.tripCard}>
          <View style={styles.routeHeader}>
            <View style={styles.routeIconWrap}>
              <MaterialCommunityIcons name="bus" size={20} color="#1e3a8a" />
            </View>
            <View style={{ flex: 1, marginLeft: 12 }}>
              <Text style={styles.routeTitle}>
                {scheduleData?.origin} → {scheduleData?.destination}
              </Text>
              <Text style={styles.routeSubtitle}>
                {scheduleData?.bus_number} • {scheduleData?.bus_type}
              </Text>
            </View>
          </View>

          <View style={styles.timeline}>
            <View style={styles.timelineLeft}>
              <View style={styles.timelineDot} />
              <View style={styles.timelineLine} />
              <View style={[styles.timelineDot, styles.timelineDotEnd]} />
            </View>
            <View style={styles.timelineRight}>
              <View style={styles.timeRow}>
                <Text style={styles.timeLabel}>DEPARTURE</Text>
                <Text style={styles.timeValue}>{departure.format("hh:mm A")}</Text>
                <Text style={styles.timeDate}>{departure.format("DD MMM YYYY, ddd")}</Text>
              </View>
              <View style={styles.durationBadge}>
                <Feather name="clock" size={12} color="#ff8a4c" />
                <Text style={styles.durationText}>
                  {durationHours}h {durationMinutes > 0 ? `${durationMinutes}m` : ""}
                </Text>
              </View>
              <View style={[styles.timeRow, { alignItems: "flex-end" }]}>
                <Text style={styles.timeLabel}>ARRIVAL</Text>
                <Text style={styles.timeValue}>{arrival.format("hh:mm A")}</Text>
                <Text style={styles.timeDate}>{arrival.format("DD MMM YYYY, ddd")}</Text>
              </View>
            </View>
          </View>

          {amenities.length > 0 && (
            <View style={styles.amenitiesWrap}>
              {amenities.map((item, idx) => {
                const { icon, lib: IconLib } = getAmenityIcon(item);
                return (
                  <View key={idx} style={styles.amenityTag}>
                    <IconLib name={icon} size={11} color="#0284c7" />
                    <Text style={styles.amenityText}>{item}</Text>
                  </View>
                );
              })}
            </View>
          )}
        </Animated.View>

        <Animated.View entering={FadeInUp.duration(800).delay(300)} style={styles.sectionHeader}>
          <View style={styles.sectionBar} />
          <Text style={styles.sectionTitle}>Choose Your Seats</Text>
          <Text style={styles.sectionSubtitle}>{seatLayout.length} rows available</Text>
        </Animated.View>

        <Animated.View entering={FadeInUp.duration(800).delay(400)} style={styles.seatMapCard}>
          <View style={styles.driverArea}>
            <View style={styles.driverIconWrap}>
              <MaterialCommunityIcons name="steering" size={22} color="#64748b" />
            </View>
            <View style={styles.driverLine} />
            <Text style={styles.driverLabel}>DRIVER</Text>
          </View>

          {seatLayout.length === 0 ? (
            <View style={styles.emptyLayout}>
              <MaterialCommunityIcons name="seat-outline" size={48} color="#cbd5e1" />
              <Text style={styles.emptyLayoutText}>No seat layout available</Text>
            </View>
          ) : (
            <>
              <View style={styles.colHeaders}>
                <Text style={styles.colHeaderText}>Left</Text>
                <View style={{ width: AISLE_WIDTH }} />
                <Text style={styles.colHeaderText}>Right</Text>
              </View>

              {seatLayout.map((row, rowIdx) => (
                <View key={rowIdx} style={styles.seatRow}>
                  <View style={styles.seatGroup}>
                    {row.slice(0, 2).map((seat, colIdx) => renderSeat(seat, rowIdx, colIdx))}
                  </View>
                  <View style={{ width: AISLE_WIDTH }} />
                  <View style={styles.seatGroup}>
                    {row.slice(2, 4).map((seat, colIdx) =>
                      renderSeat(seat, rowIdx, colIdx + 2)
                    )}
                  </View>
                </View>
              ))}
            </>
          )}

          <View style={styles.legendCard}>
            <View style={styles.legendTitleRow}>
              <Ionicons name="information-circle-outline" size={14} color="#64748b" />
              <Text style={styles.legendTitle}>SEAT STATUS</Text>
            </View>
            <View style={styles.legendGrid}>
              {[
                {
                  label: "Available", bg: "#fff", border: "#cbd5e1",
                  icon: null,
                },
                {
                  label: "Selected", bg: "#ff8a4c", border: "#ff8a4c",
                  icon: <Ionicons name="checkmark" size={8} color="#fff" />,
                },
                {
                  label: "Booked", bg: "#f1f5f9", border: "#e2e8f0",
                  icon: (
                    <View style={{ width: 10, height: 2, backgroundColor: "#94a3b8", borderRadius: 1 }} />
                  ),
                },
                {
                  label: "Women", bg: "#fdf2f8", border: "#fbcfe8",
                  icon: <View style={{ width: 5, height: 5, borderRadius: 3, backgroundColor: "#db2777" }} />,
                },
                {
                  label: "Locked", bg: "#fef2f2", border: "#fecaca",
                  icon: <Ionicons name="lock-closed" size={8} color="#ef4444" />,
                },
              ].map((item, idx) => (
                <View key={idx} style={styles.legendItem}>
                  <View style={[styles.legendSwatch, { backgroundColor: item.bg, borderColor: item.border }]}>
                    {item.icon}
                  </View>
                  <Text style={styles.legendLabel}>{item.label}</Text>
                </View>
              ))}
            </View>
          </View>
        </Animated.View>

        {selectedSeats.length > 0 && (
          <Animated.View entering={FadeInUp.duration(800).delay(500)} style={styles.summaryCard}>
            <View style={styles.summaryHeader}>
              <Ionicons name="checkmark-circle" size={18} color="#10b981" />
              <Text style={styles.summaryTitle}>Your Selection</Text>
            </View>
            <View style={styles.summaryRow}>
              <View style={styles.summarySeats}>
                {selectedSeats.map((seat) => (
                  <View key={seat} style={styles.selectedSeatTag}>
                    <MaterialCommunityIcons name="seat" size={14} color="#fff" />
                    <Text style={styles.selectedSeatText}>{seat}</Text>
                  </View>
                ))}
              </View>
            </View>
          </Animated.View>
        )}

        <View style={{ height: 20 }} />
      </ScrollView>

      <View style={styles.bottomBar}>
        <View style={styles.bottomBarInner}>
          <View style={styles.fareSection}>
            <Text style={styles.fareLabel}>Total Fare</Text>
            <Text style={styles.fareValue}>NPR {totalFare.toLocaleString()}</Text>
            <Text style={styles.perSeatText}>
              {selectedSeats.length > 0
                ? `${selectedSeats.length} seat${selectedSeats.length > 1 ? "s" : ""} × NPR ${parseInt(scheduleData?.base_price || 0).toLocaleString()}`
                : "per seat: NPR " + parseInt(scheduleData?.base_price || 0).toLocaleString()}
            </Text>
          </View>

          <TouchableOpacity
            style={[
              styles.continueBtn,
              selectedSeats.length === 0 && styles.continueBtnDisabled,
            ]}
            disabled={selectedSeats.length === 0}
            onPress={handleContinue}
            activeOpacity={0.85}
          >
            <Text style={styles.continueBtnText}>Continue</Text>
            <Ionicons name="arrow-forward" size={18} color="#fff" />
          </TouchableOpacity>
        </View>

        <View style={styles.bottomHint}>
          <Ionicons name="information-circle" size={11} color="#94a3b8" />
          <Text style={styles.hintText}>You can select up to 4 seats</Text>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f8fafc",
  },
  topCircle: {
    position: "absolute",
    top: -width * 0.5,
    right: -width * 0.25,
    width: width * 1.3,
    height: width * 1.3,
    borderRadius: width * 0.65,
    backgroundColor: "#e0f2fe",
    zIndex: -1,
  },

  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    marginTop: 16,
    color: "#64748b",
    fontSize: 15,
    fontWeight: "600",
  },

  header: {
    paddingHorizontal: 20,
    paddingTop: Platform.OS === "ios" ? 8 : 16,
    paddingBottom: 4,
  },
  headerTop: {
    flexDirection: "row",
    alignItems: "center",
  },
  backBtn: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  brandText: {
    color: "#1e3a8a",
    fontSize: 10,
    fontWeight: "900",
    letterSpacing: 1.5,
    marginBottom: 2,
  },
  headerTitle: {
    color: "#0f172a",
    fontSize: 20,
    fontWeight: "900",
  },
  helpBtn: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },

  tripCard: {
    marginHorizontal: 20,
    marginTop: 16,
    backgroundColor: "#fff",
    borderRadius: 24,
    padding: 20,
    shadowColor: "#1e3a8a",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.08,
    shadowRadius: 20,
    elevation: 4,
  },
  routeHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
  },
  routeIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: "#eff6ff",
    alignItems: "center",
    justifyContent: "center",
  },
  routeTitle: {
    fontSize: 17,
    fontWeight: "900",
    color: "#0f172a",
  },
  routeSubtitle: {
    fontSize: 12,
    color: "#64748b",
    marginTop: 2,
    fontWeight: "500",
  },

  timeline: {
    flexDirection: "row",
    marginBottom: 14,
  },
  timelineLeft: {
    alignItems: "center",
    width: 24,
    marginRight: 12,
  },
  timelineDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: "#1e3a8a",
    borderWidth: 2,
    borderColor: "#dbeafe",
  },
  timelineDotEnd: {
    backgroundColor: "#ff8a4c",
    borderColor: "#fed7aa",
  },
  timelineLine: {
    flex: 1,
    width: 2,
    backgroundColor: "#dbeafe",
    marginVertical: 4,
  },
  timelineRight: {
    flex: 1,
    justifyContent: "space-between",
  },
  timeRow: {
    alignItems: "flex-start",
  },
  timeLabel: {
    fontSize: 9,
    fontWeight: "800",
    color: "#94a3b8",
    letterSpacing: 1,
    marginBottom: 2,
  },
  timeValue: {
    fontSize: 16,
    fontWeight: "800",
    color: "#0f172a",
  },
  timeDate: {
    fontSize: 11,
    color: "#94a3b8",
    fontWeight: "500",
    marginTop: 1,
  },
  durationBadge: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    alignSelf: "center",
    gap: 6,
    backgroundColor: "#fff7ed",
    paddingHorizontal: 14,
    paddingVertical: 5,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#fed7aa",
    marginVertical: 6,
  },
  durationText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#ff8a4c",
  },

  amenitiesWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "#f1f5f9",
  },
  amenityTag: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#f0f9ff",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#e0f2fe",
  },
  amenityText: {
    fontSize: 11,
    color: "#0369a1",
    fontWeight: "600",
  },

  sectionHeader: {
    paddingHorizontal: 24,
    marginTop: 24,
    marginBottom: 12,
  },
  sectionBar: {
    width: 4,
    height: 18,
    borderRadius: 2,
    backgroundColor: "#1e3a8a",
    marginBottom: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "900",
    color: "#0f172a",
  },
  sectionSubtitle: {
    fontSize: 12,
    color: "#94a3b8",
    fontWeight: "500",
    marginTop: 2,
  },

  seatMapCard: {
    marginHorizontal: 20,
    backgroundColor: "#fff",
    borderRadius: 24,
    padding: 20,
    shadowColor: "#1e3a8a",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.06,
    shadowRadius: 16,
    elevation: 3,
    borderWidth: 1,
    borderColor: "#f1f5f9",
  },

  driverArea: {
    alignItems: "center",
    marginBottom: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#f1f5f9",
  },
  driverIconWrap: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: "#f8fafc",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  driverLine: {
    width: 60,
    height: 2,
    backgroundColor: "#e2e8f0",
    marginTop: 8,
    marginBottom: 4,
  },
  driverLabel: {
    fontSize: 9,
    fontWeight: "700",
    color: "#94a3b8",
    letterSpacing: 1,
  },

  colHeaders: {
    flexDirection: "row",
    justifyContent: "center",
    marginBottom: 8,
  },
  colHeaderText: {
    width: SEAT_SIZE * 2 + 6,
    textAlign: "center",
    fontSize: 9,
    fontWeight: "700",
    color: "#94a3b8",
    letterSpacing: 1,
  },

  seatRow: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 6,
  },
  seatGroup: {
    flexDirection: "row",
  },

  seat: {
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 6,
    margin: 3,
    borderWidth: 1.5,
    position: "relative",
  },
  seatLabel: {
    fontSize: 10,
    fontWeight: "700",
  },
  selectedCheck: {
    position: "absolute",
    top: 1,
    right: 1,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: "rgba(255,255,255,0.3)",
    alignItems: "center",
    justifyContent: "center",
  },
  seatCross: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: "center",
    justifyContent: "center",
  },
  crossLine: {
    width: 18,
    height: 1.5,
    backgroundColor: "#94a3b8",
    position: "absolute",
  },
  womenDot: {
    position: "absolute",
    top: 3,
    right: 3,
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#db2777",
  },

  emptyLayout: {
    paddingVertical: 40,
    alignItems: "center",
  },
  emptyLayoutText: {
    marginTop: 12,
    color: "#94a3b8",
    fontSize: 14,
    fontWeight: "500",
  },

  legendCard: {
    marginTop: 16,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: "#f1f5f9",
  },
  legendTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 10,
  },
  legendTitle: {
    fontSize: 10,
    fontWeight: "700",
    color: "#64748b",
    letterSpacing: 1,
  },
  legendGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  legendItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  legendSwatch: {
    width: 20,
    height: 20,
    borderRadius: 6,
    borderWidth: 1.5,
    alignItems: "center",
    justifyContent: "center",
  },
  legendLabel: {
    fontSize: 11,
    color: "#64748b",
    fontWeight: "500",
  },

  summaryCard: {
    marginHorizontal: 20,
    marginTop: 16,
    backgroundColor: "#f0fdf4",
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: "#bbf7d0",
  },
  summaryHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 10,
  },
  summaryTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#166534",
  },
  summaryRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  summarySeats: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  selectedSeatTag: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#1e3a8a",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
  },
  selectedSeatText: {
    fontSize: 12,
    fontWeight: "800",
    color: "#fff",
  },

  bottomBar: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: "#fff",
    borderTopWidth: 1,
    borderTopColor: "#f1f5f9",
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: Platform.OS === "ios" ? 28 : 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 8,
  },
  bottomBarInner: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  fareSection: {
    flex: 1,
  },
  fareLabel: {
    fontSize: 9,
    fontWeight: "800",
    color: "#94a3b8",
    letterSpacing: 1,
    marginBottom: 2,
  },
  fareValue: {
    fontSize: 22,
    fontWeight: "900",
    color: "#0f172a",
  },
  perSeatText: {
    fontSize: 10,
    color: "#94a3b8",
    fontWeight: "500",
    marginTop: 1,
  },
  continueBtn: {
    backgroundColor: "#1e3a8a",
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 28,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    elevation: 4,
    shadowColor: "#1e3a8a",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  continueBtnDisabled: {
    backgroundColor: "#cbd5e1",
    elevation: 0,
    shadowOpacity: 0,
  },
  continueBtnText: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "900",
  },
  bottomHint: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
    marginTop: 8,
  },
  hintText: {
    fontSize: 10,
    color: "#94a3b8",
    fontWeight: "500",
  },
});
