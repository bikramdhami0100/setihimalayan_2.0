import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
  Dimensions,
} from "react-native";
import { Ionicons, Feather, MaterialCommunityIcons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import { useBookings } from "../../hooks/useBookings";
import dayjs from "dayjs";
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
      <View style={styles.container}>
        <View style={styles.topCircle} />
        <View style={styles.centerContent}>
          <View style={styles.loaderCard}>
            <ActivityIndicator size="large" color="#1e3a8a" />
            <Text style={styles.loaderText}>Finalizing your ticket...</Text>
          </View>
        </View>
      </View>
    );
  }

  if (!currentBooking) {
    return (
      <View style={styles.container}>
        <View style={styles.topCircle} />
        <View style={styles.centerContent}>
          <View style={styles.loaderCard}>
            <View style={[styles.emptyIconWrap, { backgroundColor: "#fef2f2" }]}>
              <Ionicons name="alert-circle" size={44} color="#dc2626" />
            </View>
            <Text style={styles.emptyTitle}>Booking Not Found</Text>
            <Text style={styles.emptyDesc}>
              We couldn't find a booking with that reference.
            </Text>
            <TouchableOpacity onPress={() => router.push("/(customer)/")} style={styles.emptyBtn}>
              <Feather name="search" size={15} color="#fff" />
              <Text style={styles.emptyBtnText}>Return to Search</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  }

  const origin = currentBooking.origin || "Kathmandu";
  const destination = currentBooking.destination || "Pokhara";
  const departureTime = currentBooking.departure_time ? dayjs(currentBooking.departure_time) : dayjs();
  const arrivalTime = currentBooking.arrival_time ? dayjs(currentBooking.arrival_time) : dayjs();
  const busType = currentBooking.bus_type || "Standard";
  const bookingRef = currentBooking.booking_reference || currentBooking.reference_number;
  const totalAmount = currentBooking.total_amount;
  const selectedSeats = currentBooking.selected_seats || [];

  const region = {
    latitude: 27.6946,
    longitude: 85.2818,
    latitudeDelta: 0.01,
    longitudeDelta: 0.01,
  };

  return (
    <View style={styles.container}>
      <View style={styles.topCircle} />

      <ScrollView showsVerticalScrollIndicator={false} bounces={false}>
        {/* ─── HEADER ─── */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={20} color="#fff" />
          </TouchableOpacity>
          <View>
            <Text style={styles.brandText}>SETI HIMALAYAN</Text>
            <Text style={styles.headerTitle}>Booking Confirmed!</Text>
          </View>
        </View>

        {/* ─── SUCCESS CARD ─── */}
        <View style={styles.successCard}>
          <View style={styles.successIconWrap}>
            <Feather name="check" size={32} color="#fff" />
          </View>
          <Text style={styles.successTitle}>Payment Successful!</Text>
          <Text style={styles.successSub}>Your trip to {destination} is confirmed.</Text>
        </View>

        {/* ─── BOOKING CARD ─── */}
        <View style={styles.bookingCard}>
          <View style={styles.bookingCardTop}>
            <View>
              <Text style={styles.cardLabel}>Booking Reference</Text>
              <Text style={styles.cardRef}>{bookingRef}</Text>
            </View>
            <View style={styles.confirmedPill}>
              <Ionicons name="checkmark-circle" size={12} color="#16a34a" />
              <Text style={styles.confirmedPillText}>CONFIRMED</Text>
            </View>
          </View>

          {/* Route */}
          <View style={styles.routeSection}>
            <View style={styles.routeSide}>
              <View style={[styles.routeDot, { backgroundColor: "#38bdf8" }]} />
              <Text style={styles.routeLabel}>FROM</Text>
              <Text style={styles.routePlace}>{origin}</Text>
              <Text style={styles.routeTime}>{departureTime.format("hh:mm A")}</Text>
            </View>
            <View style={styles.routeCenter}>
              <View style={styles.routeLine} />
              <View style={styles.routeBusIconWrap}>
                <Ionicons name="bus" size={16} color="#1e3a8a" />
              </View>
              <Text style={styles.routeDirect}>DIRECT</Text>
            </View>
            <View style={[styles.routeSide, { alignItems: "flex-end" }]}>
              <View style={[styles.routeDot, { backgroundColor: "#f97316" }]} />
              <Text style={styles.routeLabel}>TO</Text>
              <Text style={styles.routePlace}>{destination}</Text>
              <Text style={styles.routeTime}>{arrivalTime.format("hh:mm A")}</Text>
            </View>
          </View>

          {/* Details */}
          <View style={styles.detailsGrid}>
            <View style={styles.detailItem}>
              <View style={[styles.detailIcon, { backgroundColor: "#f0fdf4" }]}>
                <MaterialCommunityIcons name="seat" size={16} color="#16a34a" />
              </View>
              <Text style={styles.detailLabel}>Seats</Text>
              <Text style={styles.detailValue}>{selectedSeats.join(", ")}</Text>
            </View>
            <View style={styles.detailDivider} />
            <View style={styles.detailItem}>
              <View style={[styles.detailIcon, { backgroundColor: "#fffbeb" }]}>
                <MaterialCommunityIcons name="bus-side" size={16} color="#d97706" />
              </View>
              <Text style={styles.detailLabel}>Bus Type</Text>
              <Text style={styles.detailValue}>{busType}</Text>
            </View>
            <View style={styles.detailDivider} />
            <View style={styles.detailItem}>
              <View style={[styles.detailIcon, { backgroundColor: "#eff6ff" }]}>
                <Feather name="credit-card" size={16} color="#1e3a8a" />
              </View>
              <Text style={styles.detailLabel}>Total Paid</Text>
              <Text style={[styles.detailValue, { color: "#059669", fontWeight: "900" }]}>NPR {totalAmount}</Text>
            </View>
          </View>

          <TouchableOpacity
            activeOpacity={0.85}
            style={styles.viewTicketBtn}
            onPress={() => router.push({ pathname: "/(customer)/ticket", params: { reference: bookingRef } })}
          >
            <MaterialCommunityIcons name="ticket-confirmation" size={18} color="#fff" />
            <Text style={styles.viewTicketText}>View E-Ticket</Text>
            <Feather name="arrow-right" size={16} color="#fff" />
          </TouchableOpacity>
        </View>

        {/* ─── MAP SECTION ─── */}
        <View style={styles.sectionHead}>
          <View style={[styles.sectionBar, { backgroundColor: "#059669" }]} />
          <Text style={styles.sectionTitle}>Boarding Location</Text>
        </View>

        <View style={styles.mapCard}>
          <View style={styles.mapContainer}>
            <BusMapView region={region} />
          </View>
          <View style={styles.mapInfo}>
            <View style={[styles.mapIconWrap, { backgroundColor: "#eff6ff" }]}>
              <Ionicons name="location" size={18} color="#1e3a8a" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.mapTitle}>Kalanki Bus Stand</Text>
              <Text style={styles.mapSub}>Ring Road, Kathmandu</Text>
            </View>
            <TouchableOpacity style={styles.navigateBtn}>
              <Feather name="navigation" size={14} color="#fff" />
              <Text style={styles.navigateText}>Navigate</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* ─── QUICK ACTIONS ─── */}
        <View style={styles.sectionHead}>
          <View style={[styles.sectionBar, { backgroundColor: "#1e3a8a" }]} />
          <Text style={styles.sectionTitle}>Quick Actions</Text>
        </View>

        <View style={styles.quickActionsRow}>
          <TouchableOpacity
            style={styles.quickAction}
            onPress={() => router.push({ pathname: "/(customer)/ticket", params: { reference: bookingRef } })}
          >
            <View style={[styles.quickActionIcon, { backgroundColor: "#eff6ff" }]}>
              <MaterialCommunityIcons name="ticket-confirmation" size={20} color="#1e3a8a" />
            </View>
            <Text style={styles.quickActionLabel}>View Ticket</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.quickAction}
            onPress={() => router.push("/(customer)/(tabs)/my-bookings")}
          >
            <View style={[styles.quickActionIcon, { backgroundColor: "#ecfdf5" }]}>
              <Feather name="list" size={20} color="#059669" />
            </View>
            <Text style={styles.quickActionLabel}>My Trips</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.quickAction}
            onPress={() => router.push("/(customer)/")}
          >
            <View style={[styles.quickActionIcon, { backgroundColor: "#fffbeb" }]}>
              <Feather name="home" size={20} color="#d97706" />
            </View>
            <Text style={styles.quickActionLabel}>Home</Text>
          </TouchableOpacity>
        </View>

        {/* ─── TRAVEL REMINDER ─── */}
        <View style={styles.reminderCard}>
          <View style={[styles.reminderIcon, { backgroundColor: "#eff6ff" }]}>
            <Ionicons name="information-circle" size={22} color="#1e3a8a" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.reminderTitle}>Travel Reminder</Text>
            <Text style={styles.reminderText}>
              Please arrive at the boarding point 30 minutes before departure. Keep your e-ticket handy for verification.
            </Text>
          </View>
        </View>

        {/* ─── SECURITY BADGE ─── */}
        <View style={styles.securityBadge}>
          <Ionicons name="shield-checkmark" size={14} color="#1e40af" />
          <Text style={styles.securityText}>SECURE & ENCRYPTED BOOKING</Text>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f8fafc" },
  centerContent: { flex: 1, justifyContent: "center", alignItems: "center", paddingHorizontal: 24 },
  topCircle: {
    position: "absolute",
    top: -width * 0.4,
    right: -width * 0.2,
    width: width * 1.2,
    height: width * 1.2,
    borderRadius: width * 0.6,
    backgroundColor: "#e0f2fe",
  },

  // ── Header ──
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingTop: 52,
    paddingHorizontal: 20,
    paddingBottom: 8,
  },
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: "#1e3a8a",
    alignItems: "center",
    justifyContent: "center",
  },
  brandText: { color: "#1e3a8a", fontSize: 10, fontWeight: "900", letterSpacing: 1.5 },
  headerTitle: { color: "#0f172a", fontSize: 22, fontWeight: "900", marginTop: 1 },

  // ── Loader / Empty ──
  loaderCard: {
    alignItems: "center",
    backgroundColor: "#fff",
    borderRadius: 24,
    padding: 40,
    borderWidth: 1,
    borderColor: "#f1f5f9",
    shadowColor: "#000",
    shadowOpacity: 0.04,
    shadowRadius: 10,
    elevation: 2,
  },
  loaderText: { marginTop: 16, color: "#64748b", fontSize: 14, fontWeight: "600" },
  emptyIconWrap: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  emptyTitle: { fontSize: 18, fontWeight: "900", color: "#0f172a", marginBottom: 8 },
  emptyDesc: { color: "#64748b", textAlign: "center", marginBottom: 20, lineHeight: 20 },
  emptyBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#1e3a8a",
    paddingHorizontal: 22,
    paddingVertical: 13,
    borderRadius: 16,
    shadowColor: "#1e3a8a",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  emptyBtnText: { color: "#fff", fontWeight: "800", fontSize: 13 },

  // ── Success Card ──
  successCard: {
    alignItems: "center",
    marginTop: 20,
    marginHorizontal: 20,
    backgroundColor: "#fff",
    borderRadius: 24,
    padding: 28,
    borderWidth: 1,
    borderColor: "#f1f5f9",
    shadowColor: "#000",
    shadowOpacity: 0.04,
    shadowRadius: 12,
    elevation: 2,
  },
  successIconWrap: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: "#22c55e",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 14,
    shadowColor: "#22c55e",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  successTitle: { color: "#0f172a", fontSize: 20, fontWeight: "900" },
  successSub: { color: "#64748b", fontSize: 13, marginTop: 4, textAlign: "center" },

  // ── Booking Card ──
  bookingCard: {
    backgroundColor: "#fff",
    marginHorizontal: 20,
    marginTop: 16,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: "#f1f5f9",
    shadowColor: "#000",
    shadowOpacity: 0.04,
    shadowRadius: 12,
    elevation: 2,
    overflow: "hidden",
  },
  bookingCardTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#f8fafc",
  },
  cardLabel: { color: "#94a3b8", fontSize: 9, fontWeight: "700", letterSpacing: 1, textTransform: "uppercase" },
  cardRef: { color: "#0f172a", fontSize: 16, fontWeight: "900", marginTop: 2 },
  confirmedPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#f0fdf4",
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 100,
    borderWidth: 1,
    borderColor: "#dcfce7",
  },
  confirmedPillText: { color: "#16a34a", fontSize: 9, fontWeight: "800", letterSpacing: 0.5 },

  // Route
  routeSection: {
    flexDirection: "row",
    alignItems: "center",
    padding: 20,
    gap: 12,
  },
  routeSide: { flex: 1 },
  routeDot: { width: 8, height: 8, borderRadius: 4, marginBottom: 4 },
  routeLabel: { color: "#94a3b8", fontSize: 9, fontWeight: "700", letterSpacing: 0.5, textTransform: "uppercase" },
  routePlace: { color: "#0f172a", fontSize: 17, fontWeight: "900", marginTop: 1 },
  routeTime: { color: "#64748b", fontSize: 11, fontWeight: "500", marginTop: 2 },
  routeCenter: { alignItems: "center", paddingHorizontal: 8 },
  routeLine: { width: 48, height: 1.5, backgroundColor: "#cbd5e1", marginBottom: 4 },
  routeBusIconWrap: {
    backgroundColor: "#eff6ff",
    padding: 6,
    borderRadius: 10,
    marginVertical: 4,
  },
  routeDirect: { color: "#94a3b8", fontSize: 8, fontWeight: "700", letterSpacing: 1, textTransform: "uppercase" },

  // Details
  detailsGrid: {
    flexDirection: "row",
    padding: 20,
    paddingTop: 0,
    gap: 8,
  },
  detailItem: { flex: 1, alignItems: "center", gap: 4 },
  detailIcon: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },
  detailLabel: { color: "#94a3b8", fontSize: 9, fontWeight: "700", textTransform: "uppercase", letterSpacing: 0.3 },
  detailValue: { color: "#0f172a", fontSize: 12, fontWeight: "800", textAlign: "center" },
  detailDivider: { width: 1, backgroundColor: "#f1f5f9" },

  viewTicketBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "#1e3a8a",
    marginHorizontal: 20,
    marginBottom: 20,
    borderRadius: 16,
    paddingVertical: 15,
    shadowColor: "#1e3a8a",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  viewTicketText: { color: "#fff", fontSize: 14, fontWeight: "800" },

  // ── Section ──
  sectionHead: { flexDirection: "row", alignItems: "center", gap: 8, marginTop: 24, marginBottom: 12, paddingHorizontal: 20 },
  sectionBar: { width: 4, height: 16, borderRadius: 2 },
  sectionTitle: { fontSize: 14, fontWeight: "800", color: "#0f172a" },

  // ── Map ──
  mapCard: {
    marginHorizontal: 20,
    backgroundColor: "#fff",
    borderRadius: 20,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#f1f5f9",
    shadowColor: "#000",
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  mapContainer: { height: 180, backgroundColor: "#e2e8f0" },
  mapInfo: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 14,
    borderTopWidth: 1,
    borderTopColor: "#f1f5f9",
  },
  mapIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  mapTitle: { color: "#0f172a", fontSize: 13, fontWeight: "700" },
  mapSub: { color: "#94a3b8", fontSize: 11, marginTop: 1 },
  navigateBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#1e3a8a",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
  },
  navigateText: { color: "#fff", fontSize: 11, fontWeight: "700" },

  // ── Quick Actions ──
  quickActionsRow: {
    flexDirection: "row",
    gap: 10,
    paddingHorizontal: 20,
  },
  quickAction: {
    flex: 1,
    backgroundColor: "#fff",
    borderRadius: 18,
    paddingVertical: 16,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#f1f5f9",
    shadowColor: "#000",
    shadowOpacity: 0.03,
    shadowRadius: 8,
    elevation: 1,
  },
  quickActionIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  quickActionLabel: { color: "#475569", fontSize: 11, fontWeight: "600" },

  // ── Reminder ──
  reminderCard: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 14,
    backgroundColor: "#fff",
    marginHorizontal: 20,
    marginTop: 20,
    padding: 18,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#f1f5f9",
    shadowColor: "#000",
    shadowOpacity: 0.03,
    shadowRadius: 6,
    elevation: 1,
  },
  reminderIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  reminderTitle: { color: "#0f172a", fontSize: 13, fontWeight: "700", marginBottom: 4 },
  reminderText: { color: "#64748b", fontSize: 12, lineHeight: 18 },

  // ── Security Badge ──
  securityBadge: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 28,
    backgroundColor: "#eff6ff",
    alignSelf: "center",
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 100,
    borderWidth: 1,
    borderColor: "#dbeafe",
    gap: 8,
  },
  securityText: { fontSize: 10, fontWeight: "900", color: "#1e40af", letterSpacing: 1 },
});
