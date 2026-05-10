import React, { useEffect, useState, useCallback } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Platform,
  StatusBar,
  StyleSheet,
  Dimensions,
} from "react-native";
import { Ionicons, Feather, MaterialCommunityIcons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import QRCode from "react-native-qrcode-svg";
import dayjs from "dayjs";
import { useBookings } from "../../hooks/useBookings";
import * as FileSystem from "expo-file-system";
import * as Sharing from "expo-sharing";
import { downloadTicket } from "../../api/bookings";

const { width } = Dimensions.get("window");

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

  const handleDownloadPDF = useCallback(async () => {
    if (downloading || !currentBooking) return;
    setDownloading(true);
    const bookingRef = currentBooking.booking_reference;
    try {
      const response = await downloadTicket(bookingRef);
      const blob = response.data;

      if (Platform.OS === "web" || (!FileSystem.documentDirectory && !FileSystem.cacheDirectory)) {
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = `ticket-${bookingRef}.pdf`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        Alert.alert("Success", "PDF downloaded");
      } else {
        const base64 = await new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result.split(",")[1]);
          reader.onerror = reject;
          reader.readAsDataURL(blob);
        });
        const directory = FileSystem.documentDirectory || FileSystem.cacheDirectory;
        const fileUri = `${directory}ticket-${bookingRef}.pdf`;
        await FileSystem.writeAsStringAsync(fileUri, base64, { encoding: FileSystem.EncodingType.Base64 });

        if (await Sharing.isAvailableAsync()) {
          await Sharing.shareAsync(fileUri);
        } else {
          Alert.alert("Success", `PDF saved to: ${fileUri}`);
        }
      }
    } catch (err) {
      Alert.alert("Download Failed", err.message);
    } finally {
      setDownloading(false);
    }
  }, [currentBooking, downloading]);

  const handleShare = useCallback(async () => {
    if (downloading || !currentBooking) return;
    setDownloading(true);
    const bookingRef = currentBooking.booking_reference;
    try {
      const response = await downloadTicket(bookingRef);
      const blob = response.data;

      if (Platform.OS === "web") {
        if (navigator.share) {
          const file = new File([blob], `ticket-${bookingRef}.pdf`, { type: "application/pdf" });
          navigator.share({ files: [file], title: "E-Ticket", text: `Your bus ticket ${bookingRef}` });
        } else {
          Alert.alert("Share", "Web Share not supported. Try downloading instead.");
        }
      } else {
        const base64 = await new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result.split(",")[1]);
          reader.onerror = reject;
          reader.readAsDataURL(blob);
        });
        const directory = FileSystem.documentDirectory || FileSystem.cacheDirectory;
        const fileUri = `${directory}ticket-${bookingRef}.pdf`;
        await FileSystem.writeAsStringAsync(fileUri, base64, { encoding: FileSystem.EncodingType.Base64 });

        if (await Sharing.isAvailableAsync()) {
          await Sharing.shareAsync(fileUri);
        } else {
          Alert.alert("Success", `PDF saved to: ${fileUri}`);
        }
      }
    } catch (err) {
      Alert.alert("Share Failed", err.message);
    } finally {
      setDownloading(false);
    }
  }, [currentBooking, downloading]);

  if (loading || isLoading) {
    return (
      <View style={styles.container}>
        <View style={styles.topCircle} />
        <View style={styles.centerContent}>
          <View style={styles.centerCard}>
            <ActivityIndicator size="large" color="#1e3a8a" />
            <Text style={styles.centerText}>Loading your ticket...</Text>
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
          <View style={styles.centerCard}>
            <View style={[styles.centerIconWrap, { backgroundColor: "#fef2f2" }]}>
              <Ionicons name="alert-circle-outline" size={44} color="#dc2626" />
            </View>
            <Text style={styles.centerTitle}>Ticket not found</Text>
            <TouchableOpacity onPress={() => router.back()} style={styles.backBtnMain}>
              <Ionicons name="arrow-back" size={16} color="#fff" />
              <Text style={styles.backBtnText}>Go Back</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
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

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#1e3a8a" />
      <View style={styles.topCircle} />

      <ScrollView showsVerticalScrollIndicator={false} bounces={false}>
        {/* ─── HEADER ─── */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.headerBtn}>
            <Ionicons name="arrow-back" size={20} color="#fff" />
          </TouchableOpacity>
          <View style={{ flex: 1 }}>
            <Text style={styles.brandText}>SETI HIMALAYAN</Text>
            <Text style={styles.headerTitle}>E-Ticket</Text>
          </View>
          <TouchableOpacity onPress={handleDownloadPDF} disabled={downloading} style={styles.headerBtn}>
            <Ionicons name="download-outline" size={20} color="#fff" />
          </TouchableOpacity>
        </View>

        {/* ─── TICKET CARD ─── */}
        <View style={styles.ticketCard}>
          {/* Top brand section */}
          <View style={styles.ticketBrand}>
            <View style={styles.brandLeft}>
              <View style={styles.brandIconWrap}>
                <MaterialCommunityIcons name="bus-marker" size={22} color="#fff" />
              </View>
              <View>
                <Text style={styles.brandSub}>SETI HIMALAYAN</Text>
                <Text style={styles.brandName}>Tours & Travels</Text>
              </View>
            </View>
            <View style={styles.confirmedBadge}>
              <Ionicons name="checkmark-circle" size={10} color="#22c55e" />
              <Text style={styles.confirmedText}>CONFIRMED</Text>
            </View>
          </View>

          {/* QR + Ref */}
          <View style={styles.qrSection}>
            <View style={styles.qrInner}>
              <View style={styles.qrWrap}>
                <QRCode value={qrValue} size={130} color="#0f172a" backgroundColor="#fff" />
              </View>
              <View style={styles.refRow}>
                <Ionicons name="receipt-outline" size={11} color="#94a3b8" />
                <Text style={styles.refText}>{bookingRef}</Text>
              </View>
              <View style={styles.validPill}>
                <View style={styles.validDot} />
                <Text style={styles.validText}>VALID E-TICKET</Text>
              </View>
            </View>
          </View>

          {/* Perforated divider */}
          <View style={styles.perfDivider}>
            <View style={styles.perfCircle} />
            <View style={styles.perfLine} />
            <View style={styles.perfCircle} />
          </View>

          {/* Details */}
          <View style={styles.detailsSection}>
            <View style={styles.detailRow}>
              <View style={[styles.detailIcon, { backgroundColor: "#eff6ff" }]}>
                <Feather name="user" size={14} color="#1e3a8a" />
              </View>
              <Text style={styles.detailLabel}>Passenger</Text>
              <Text style={styles.detailValue}>{primaryPassenger}</Text>
            </View>
            <View style={styles.detailHr} />
            <View style={styles.detailRow}>
              <View style={[styles.detailIcon, { backgroundColor: "#f0fdf4" }]}>
                <MaterialCommunityIcons name="seat" size={14} color="#16a34a" />
              </View>
              <Text style={styles.detailLabel}>Seats</Text>
              <Text style={styles.detailValue}>{seatDisplay}</Text>
            </View>
            <View style={styles.detailHr} />
            <View style={styles.detailRow}>
              <View style={[styles.detailIcon, { backgroundColor: "#fffbeb" }]}>
                <MaterialCommunityIcons name="bus-side" size={14} color="#d97706" />
              </View>
              <Text style={styles.detailLabel}>Bus Type</Text>
              <Text style={styles.detailValue}>{busType}</Text>
            </View>
            <View style={styles.detailHr} />
            <View style={styles.detailRow}>
              <View style={[styles.detailIcon, { backgroundColor: "#fef2f2" }]}>
                <MaterialCommunityIcons name="steering" size={14} color="#dc2626" />
              </View>
              <Text style={styles.detailLabel}>Bus No.</Text>
              <Text style={styles.detailValue}>{busNumber}</Text>
            </View>
          </View>

          {/* Route */}
          <View style={styles.routeBox}>
            <View style={styles.routeSide}>
              <View style={[styles.routePin, { backgroundColor: "#38bdf8" }]} />
              <Text style={styles.routeLabel}>FROM</Text>
              <Text style={styles.routePlace}>{origin}</Text>
            </View>
            <View style={styles.routeMid}>
              <View style={styles.routeLine} />
              <View style={styles.routeIcon}>
                <Ionicons name="bus" size={16} color="#fff" />
              </View>
              <View style={styles.routeLine} />
            </View>
            <View style={[styles.routeSide, { alignItems: "flex-end" }]}>
              <View style={[styles.routePin, { backgroundColor: "#f97316" }]} />
              <Text style={styles.routeLabel}>TO</Text>
              <Text style={styles.routePlace}>{destination}</Text>
            </View>
          </View>

          {/* Date/Time */}
          <View style={styles.dateSection}>
            <View style={styles.dateItem}>
              <View style={[styles.dateIcon, { backgroundColor: "#eff6ff" }]}>
                <Feather name="calendar" size={15} color="#1e3a8a" />
              </View>
              <View>
                <Text style={styles.dateLabel}>Departure</Text>
                <Text style={styles.dateValue}>{departureTime.format("DD MMM YYYY")}</Text>
              </View>
            </View>
            <View style={styles.dateVr} />
            <View style={styles.dateItem}>
              <View style={[styles.dateIcon, { backgroundColor: "#fffbeb" }]}>
                <Feather name="clock" size={15} color="#d97706" />
              </View>
              <View>
                <Text style={styles.dateLabel}>Boarding</Text>
                <Text style={styles.dateValue}>{departureTime.format("hh:mm A")}</Text>
              </View>
            </View>
          </View>

          {/* Footer note */}
          <View style={styles.ticketFooter}>
            <Ionicons name="information-circle-outline" size={13} color="#94a3b8" />
            <Text style={styles.footerText}>Show QR code at counter for boarding</Text>
          </View>
        </View>

        {/* ─── ACTIONS ─── */}
        <TouchableOpacity
          onPress={handleDownloadPDF}
          disabled={downloading}
          activeOpacity={0.85}
          style={styles.actionBtn}
        >
          {downloading ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <>
              <Ionicons name="download-outline" size={20} color="#fff" />
              <Text style={styles.actionBtnText}>Download PDF Ticket</Text>
            </>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          onPress={handleShare}
          disabled={downloading}
          activeOpacity={0.7}
          style={styles.shareBtn}
        >
          <Ionicons name="share-outline" size={20} color="#1e3a8a" />
          <Text style={styles.shareBtnText}>Share with Family</Text>
        </TouchableOpacity>

        {/* ─── TIP ─── */}
        <View style={styles.tipCard}>
          <View style={[styles.tipIcon, { backgroundColor: "#eff6ff" }]}>
            <Ionicons name="bulb-outline" size={20} color="#1e3a8a" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.tipTitle}>Travel Tip</Text>
            <Text style={styles.tipBody}>
              Arrive 30 minutes early for verification. Have a safe journey!
            </Text>
          </View>
        </View>

        {/* ─── SECURITY ─── */}
        <View style={styles.securityBadge}>
          <Ionicons name="shield-checkmark" size={14} color="#1e40af" />
          <Text style={styles.securityText}>SECURE & ENCRYPTED TICKET</Text>
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

  centerCard: {
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
  centerText: { marginTop: 16, color: "#64748b", fontSize: 14, fontWeight: "600" },
  centerIconWrap: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  centerTitle: { fontSize: 18, fontWeight: "900", color: "#0f172a", marginBottom: 20 },
  backBtnMain: {
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
  backBtnText: { color: "#fff", fontWeight: "800", fontSize: 13 },

  // ── Header ──
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingTop: 52,
    paddingHorizontal: 20,
    paddingBottom: 8,
  },
  headerBtn: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: "#1e3a8a",
    alignItems: "center",
    justifyContent: "center",
  },
  brandText: { color: "#1e3a8a", fontSize: 10, fontWeight: "900", letterSpacing: 1.5 },
  headerTitle: { color: "#0f172a", fontSize: 22, fontWeight: "900", marginTop: 1 },

  // ── Ticket Card ──
  ticketCard: {
    backgroundColor: "#fff",
    borderRadius: 24,
    marginHorizontal: 16,
    marginTop: 20,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 14,
    elevation: 3,
    overflow: "hidden",
  },

  // Brand header
  ticketBrand: {
    backgroundColor: "#0f172a",
    paddingHorizontal: 20,
    paddingVertical: 18,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  brandLeft: { flexDirection: "row", alignItems: "center", gap: 12 },
  brandIconWrap: {
    width: 42,
    height: 42,
    borderRadius: 12,
    backgroundColor: "rgba(255,255,255,0.12)",
    alignItems: "center",
    justifyContent: "center",
  },
  brandSub: { color: "#94a3b8", fontSize: 9, fontWeight: "700", letterSpacing: 1, textTransform: "uppercase" },
  brandName: { color: "#fff", fontSize: 17, fontWeight: "900", marginTop: 1 },
  confirmedBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "rgba(255,255,255,0.1)",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
  },
  confirmedText: { color: "#fff", fontSize: 9, fontWeight: "800", letterSpacing: 1 },

  // QR
  qrSection: { alignItems: "center", paddingVertical: 28 },
  qrInner: { alignItems: "center" },
  qrWrap: {
    padding: 14,
    backgroundColor: "#fff",
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    shadowColor: "#000",
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  refRow: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 16 },
  refText: { color: "#64748b", fontSize: 10, fontWeight: "700", letterSpacing: 1 },
  validPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 12,
    backgroundColor: "#f0fdf4",
    paddingHorizontal: 14,
    paddingVertical: 5,
    borderRadius: 100,
    borderWidth: 1,
    borderColor: "#dcfce7",
  },
  validDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: "#22c55e" },
  validText: { color: "#15803d", fontSize: 9, fontWeight: "800", letterSpacing: 1.5 },

  // Perforated divider
  perfDivider: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 24,
    marginBottom: 4,
  },
  perfCircle: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: "#f8fafc",
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  perfLine: { flex: 1, height: 1, borderStyle: "dashed", borderTopWidth: 1, borderColor: "#e2e8f0" },

  // Details
  detailsSection: { paddingHorizontal: 20, paddingBottom: 4 },
  detailRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 11,
  },
  detailIcon: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  detailLabel: { color: "#94a3b8", fontSize: 10, fontWeight: "700", flex: 1, textTransform: "uppercase", letterSpacing: 0.3 },
  detailValue: { color: "#0f172a", fontSize: 14, fontWeight: "700", maxWidth: "50%", textAlign: "right" },
  detailHr: { height: 1, backgroundColor: "#f8fafc" },

  // Route
  routeBox: {
    flexDirection: "row",
    alignItems: "center",
    marginHorizontal: 20,
    marginTop: 16,
    marginBottom: 4,
    backgroundColor: "#f8fafc",
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: "#f1f5f9",
  },
  routeSide: { flex: 1 },
  routePin: { width: 8, height: 8, borderRadius: 4, marginBottom: 4 },
  routeLabel: { color: "#94a3b8", fontSize: 9, fontWeight: "700", letterSpacing: 0.5 },
  routePlace: { color: "#0f172a", fontSize: 15, fontWeight: "800", marginTop: 1 },
  routeMid: { alignItems: "center", paddingHorizontal: 12 },
  routeLine: { width: 36, height: 1.5, backgroundColor: "#cbd5e1" },
  routeIcon: {
    backgroundColor: "#1e3a8a",
    padding: 6,
    borderRadius: 10,
    marginVertical: 4,
  },

  // Date/Time
  dateSection: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 16,
    gap: 12,
  },
  dateItem: { flex: 1, flexDirection: "row", alignItems: "center", gap: 10 },
  dateIcon: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  dateLabel: { color: "#94a3b8", fontSize: 9, fontWeight: "700", letterSpacing: 0.5, textTransform: "uppercase" },
  dateValue: { color: "#0f172a", fontSize: 13, fontWeight: "700", marginTop: 1 },
  dateVr: { width: 1, height: 30, backgroundColor: "#e2e8f0" },

  // Footer
  ticketFooter: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 16,
    backgroundColor: "#fafafa",
    borderTopWidth: 1,
    borderTopColor: "#f1f5f9",
  },
  footerText: { color: "#94a3b8", fontSize: 11, fontWeight: "500" },

  // ── Actions ──
  actionBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "#1e3a8a",
    marginHorizontal: 16,
    marginTop: 20,
    borderRadius: 18,
    paddingVertical: 16,
    shadowColor: "#1e3a8a",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  actionBtnText: { color: "#fff", fontSize: 14, fontWeight: "800" },
  shareBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "#eff6ff",
    marginHorizontal: 16,
    marginTop: 12,
    borderRadius: 18,
    paddingVertical: 16,
    borderWidth: 1,
    borderColor: "#dbeafe",
  },
  shareBtnText: { color: "#1e3a8a", fontSize: 14, fontWeight: "800" },

  // ── Tip ──
  tipCard: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 14,
    backgroundColor: "#fff",
    marginHorizontal: 16,
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
  tipIcon: {
    width: 42,
    height: 42,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  tipTitle: { color: "#0f172a", fontSize: 13, fontWeight: "700", marginBottom: 4 },
  tipBody: { color: "#64748b", fontSize: 12, lineHeight: 18 },

  // ── Security ──
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
