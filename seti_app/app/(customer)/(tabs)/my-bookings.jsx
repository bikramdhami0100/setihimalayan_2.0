import React, { useEffect, useState, useCallback } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Modal,
  StatusBar,
  Alert,
  Platform,
  StyleSheet,
  Dimensions,
} from "react-native";
import Animated, { FadeInUp } from "react-native-reanimated";
import { Ionicons, Feather, MaterialCommunityIcons } from "@expo/vector-icons";
import { router } from "expo-router";
import QRCode from "react-native-qrcode-svg";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
dayjs.extend(relativeTime);
import * as FileSystem from "expo-file-system";
import * as Sharing from "expo-sharing";
import { useBookings } from "../../../hooks/useBookings";
import { downloadTicket } from "../../../api/bookings";

const { width } = Dimensions.get("window");

const STATUS_MAP = {
  confirmed: "confirmed",
  pending_payment: "pending",
  payment_processing: "pending",
  cancelled: "cancelled",
  expired: "cancelled",
  refunded: "cancelled",
};

const STATUS_COLORS = {
  confirmed: { bg: "#dcfce7", text: "#16a34a", icon: "checkmark-circle" },
  pending: { bg: "#fef9c3", text: "#ca8a04", icon: "time" },
  cancelled: { bg: "#fee2e2", text: "#dc2626", icon: "close-circle" },
};

const FILTER_TABS = [
  { key: "all", label: "All Trips", icon: "apps" },
  { key: "confirmed", label: "Confirmed", icon: "checkmark-circle" },
  { key: "pending", label: "Pending", icon: "time" },
  { key: "completed", label: "Completed", icon: "trophy" },
  { key: "cancelled", label: "Cancelled", icon: "close-circle" },
];

function BookingCard({ booking, onPress, index }) {
  const displayStatus = STATUS_MAP[booking.status] || "pending";
  const colors = STATUS_COLORS[displayStatus] || STATUS_COLORS.pending;
  const seats = Array.isArray(booking.selected_seats)
    ? booking.selected_seats.join(", ")
    : booking.selected_seats;
  const isUpcoming = dayjs(booking.departure_time).isAfter(dayjs());

  return (
    <Animated.View entering={FadeInUp.duration(400).delay(index * 60)}>
      <TouchableOpacity onPress={onPress} activeOpacity={0.85} style={styles.card}>
        <View style={styles.cardHeader}>
          <View style={styles.cardRefRow}>
            <Ionicons name="receipt" size={13} color="#64748b" />
            <Text style={styles.cardRef}>{booking.booking_reference}</Text>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: colors.bg }]}>
            <Ionicons name={colors.icon} size={11} color={colors.text} />
            <Text style={[styles.statusText, { color: colors.text }]}>{displayStatus}</Text>
          </View>
        </View>

        <View style={styles.cardBody}>
          <View style={styles.routeSection}>
            <View style={styles.routeItem}>
              <View style={[styles.routeIcon, { backgroundColor: "#eff6ff" }]}>
                <Ionicons name="location" size={14} color="#1e3a8a" />
              </View>
              <View>
                <Text style={styles.routeLabel}>FROM</Text>
                <Text style={styles.routeValue}>{booking.origin || "—"}</Text>
              </View>
            </View>
            <View style={styles.routeConnector}>
              <View style={styles.connectorDot} />
              <View style={styles.connectorLine} />
              <View style={[styles.connectorDot, { backgroundColor: "#f97316" }]} />
            </View>
            <View style={styles.routeItem}>
              <View style={[styles.routeIcon, { backgroundColor: "#fff7ed" }]}>
                <Ionicons name="location" size={14} color="#f97316" />
              </View>
              <View>
                <Text style={styles.routeLabel}>TO</Text>
                <Text style={styles.routeValue}>{booking.destination || "—"}</Text>
              </View>
            </View>
          </View>

          <View style={styles.cardMeta}>
            <View style={styles.metaItem}>
              <Feather name="calendar" size={12} color="#64748b" />
              <Text style={styles.metaText}>
                {booking.departure_time ? dayjs(booking.departure_time).format("DD MMM") : "—"}
              </Text>
            </View>
            <View style={styles.metaItem}>
              <Feather name="clock" size={12} color="#64748b" />
              <Text style={styles.metaText}>
                {booking.departure_time ? dayjs(booking.departure_time).format("hh:mm A") : "—"}
              </Text>
            </View>
            <View style={styles.metaItem}>
              <MaterialCommunityIcons name="seat" size={12} color="#64748b" />
              <Text style={styles.metaText}>{seats}</Text>
            </View>
          </View>
        </View>

        <View style={styles.cardFooter}>
          <View style={styles.footerLeft}>
            <View style={[styles.liveIndicator, { backgroundColor: isUpcoming ? "#22c55e" : "#94a3b8" }]} />
            <Text style={styles.footerText}>
              {isUpcoming ? "Upcoming" : "Past"} &middot;{" "}
              {booking.created_at ? dayjs(booking.created_at).fromNow() : ""}
            </Text>
          </View>
          <View style={styles.amountRow}>
            <Text style={styles.amountLabel}>NPR</Text>
            <Text style={styles.amountValue}>{booking.total_amount}</Text>
          </View>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
}

function TicketModal({ booking, onClose }) {
  const [downloading, setDownloading] = useState(false);

  if (!booking) return null;

  const qrData = JSON.stringify({
    ref: booking.booking_reference,
    seats: booking.selected_seats,
    amount: booking.total_amount,
  });

  const displayStatus = STATUS_MAP[booking.status] || "pending";
  const statusColors = STATUS_COLORS[displayStatus] || STATUS_COLORS.pending;

  const handleDownloadPDF = useCallback(async () => {
    if (downloading) return;
    setDownloading(true);
    try {
      const response = await downloadTicket(booking.booking_reference);
      const blob = response.data;

      if (Platform.OS === "web") {
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = `ticket-${booking.booking_reference}.pdf`;
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
        const fileUri = `${directory}ticket-${booking.booking_reference}.pdf`;
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
  }, [booking, downloading]);

  const handleShare = useCallback(async () => {
    if (downloading) return;
    setDownloading(true);
    try {
      const response = await downloadTicket(booking.booking_reference);
      const blob = response.data;

      if (Platform.OS === "web") {
        const url = URL.createObjectURL(blob);
        if (navigator.share) {
          const file = new File([blob], `ticket-${booking.booking_reference}.pdf`, { type: "application/pdf" });
          navigator.share({ files: [file], title: "E-Ticket", text: `Your ticket ${booking.booking_reference}` });
        } else {
          Alert.alert("Share", "Web Share not supported. Try downloading instead.");
        }
        URL.revokeObjectURL(url);
      } else {
        const base64 = await new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result.split(",")[1]);
          reader.onerror = reject;
          reader.readAsDataURL(blob);
        });
        const directory = FileSystem.documentDirectory || FileSystem.cacheDirectory;
        const fileUri = `${directory}ticket-${booking.booking_reference}.pdf`;
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
  }, [booking, downloading]);

  return (
    <Modal visible animationType="slide" transparent>
      <View style={styles.modalOverlay}>
        <Animated.View entering={FadeInUp.duration(400)} style={styles.modalSheet}>
          <View style={styles.modalHandle} />
          <ScrollView showsVerticalScrollIndicator={false}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalLabel}>E-TICKET</Text>
                <Text style={styles.modalRef}>{booking.booking_reference}</Text>
              </View>
              <TouchableOpacity onPress={onClose} style={styles.modalClose}>
                <Ionicons name="close" size={22} color="#64748b" />
              </TouchableOpacity>
            </View>

            <Animated.View entering={FadeInUp.duration(400).delay(100)} style={styles.modalQR}>
              <QRCode value={qrData} size={140} color="#0f172a" backgroundColor="#fff" />
            </Animated.View>

            <Animated.View entering={FadeInUp.duration(400).delay(150)} style={styles.modalInfoCard}>
              <View style={styles.modalInfoRow}>
                <Feather name="navigation" size={14} color="#1e3a8a" />
                <Text style={styles.modalInfoLabel}>From</Text>
                <Text style={styles.modalInfoValue}>{booking.origin || "—"}</Text>
              </View>
              <View style={styles.modalDivider} />
              <View style={styles.modalInfoRow}>
                <Feather name="map-pin" size={14} color="#f97316" />
                <Text style={styles.modalInfoLabel}>To</Text>
                <Text style={styles.modalInfoValue}>{booking.destination || "—"}</Text>
              </View>
              <View style={styles.modalDivider} />
              <View style={styles.modalInfoRow}>
                <Feather name="calendar" size={14} color="#64748b" />
                <Text style={styles.modalInfoLabel}>Date & Time</Text>
                <Text style={styles.modalInfoValue}>
                  {booking.departure_time ? dayjs(booking.departure_time).format("DD MMM YYYY, hh:mm A") : "—"}
                </Text>
              </View>
              <View style={styles.modalDivider} />
              <View style={styles.modalInfoRow}>
                <MaterialCommunityIcons name="seat" size={14} color="#64748b" />
                <Text style={styles.modalInfoLabel}>Seats</Text>
                <Text style={styles.modalInfoValue}>
                  {Array.isArray(booking.selected_seats) ? booking.selected_seats.join(", ") : booking.selected_seats}
                </Text>
              </View>
              <View style={styles.modalDivider} />
              <View style={styles.modalInfoRow}>
                <Feather name="credit-card" size={14} color="#059669" />
                <Text style={styles.modalInfoLabel}>Total Paid</Text>
                <Text style={[styles.modalInfoValue, { color: "#059669", fontWeight: "900" }]}>NPR {booking.total_amount}</Text>
              </View>
              <View style={styles.modalDivider} />
              <View style={styles.modalInfoRow}>
                <Ionicons name={statusColors.icon} size={14} color={statusColors.text} />
                <Text style={styles.modalInfoLabel}>Status</Text>
                <View style={[styles.modalStatusBadge, { backgroundColor: statusColors.bg }]}>
                  <Text style={[styles.modalStatusText, { color: statusColors.text }]}>{displayStatus.toUpperCase()}</Text>
                </View>
              </View>
            </Animated.View>

            <Animated.View entering={FadeInUp.duration(400).delay(250)} style={styles.modalActions}>
              <TouchableOpacity style={styles.downloadBtn} onPress={handleDownloadPDF} disabled={downloading}>
                {downloading ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <>
                    <Feather name="download" size={16} color="#fff" />
                    <Text style={styles.downloadText}>Download PDF</Text>
                  </>
                )}
              </TouchableOpacity>
              <TouchableOpacity style={styles.shareBtn} onPress={handleShare} disabled={downloading}>
                <Feather name="share-2" size={16} color="#1e3a8a" />
                <Text style={styles.shareText}>Share</Text>
              </TouchableOpacity>
            </Animated.View>
          </ScrollView>
        </Animated.View>
      </View>
    </Modal>
  );
}

export default function MyBookingsScreen() {
  const { fetchUserBookings, userBookings, isLoading } = useBookings();
  const [selectedBooking, setSelectedBooking] = useState(null);
  const [activeTab, setActiveTab] = useState("all");

  useEffect(() => {
    fetchUserBookings();
  }, []);

  const bookingsList = Array.isArray(userBookings) ? userBookings : [];
  const filtered = activeTab === "all"
    ? bookingsList
    : bookingsList.filter((b) => (STATUS_MAP[b.status] || "pending") === activeTab);

  const totalTrips = bookingsList.length;
  const upcomingCount = bookingsList.filter((b) => STATUS_MAP[b.status] === "confirmed" && dayjs(b.departure_time).isAfter(dayjs())).length;
  const completedCount = bookingsList.filter((b) => {
    const s = STATUS_MAP[b.status];
    return s === "confirmed" && dayjs(b.departure_time).isBefore(dayjs());
  }).length;

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#1e3a8a" />
      <View style={styles.topCircle} />

      <ScrollView showsVerticalScrollIndicator={false} bounces={false}>
        <Animated.View entering={FadeInUp.duration(600).delay(100)} style={styles.header}>
          <Text style={styles.brandText}>SETI HIMALAYAN</Text>
          <Text style={styles.headerTitle}>My Bookings</Text>
          <Text style={styles.headerSub}>All your trips in one place</Text>
        </Animated.View>

        <Animated.View entering={FadeInUp.duration(600).delay(200)} style={styles.statsRow}>
          <View style={styles.statCard}>
            <View style={[styles.statIcon, { backgroundColor: "#eff6ff" }]}>
              <Feather name="truck" size={16} color="#1e3a8a" />
            </View>
            <Text style={styles.statValue}>{totalTrips}</Text>
            <Text style={styles.statLabel}>Total Trips</Text>
          </View>
          <View style={styles.statCard}>
            <View style={[styles.statIcon, { backgroundColor: "#ecfdf5" }]}>
              <Feather name="arrow-up-right" size={16} color="#059669" />
            </View>
            <Text style={[styles.statValue, { color: "#059669" }]}>{upcomingCount}</Text>
            <Text style={styles.statLabel}>Upcoming</Text>
          </View>
          <View style={styles.statCard}>
            <View style={[styles.statIcon, { backgroundColor: "#f8fafc" }]}>
              <Feather name="check" size={16} color="#64748b" />
            </View>
            <Text style={[styles.statValue, { color: "#64748b" }]}>{completedCount}</Text>
            <Text style={styles.statLabel}>Completed</Text>
          </View>
        </Animated.View>

        <Animated.View entering={FadeInUp.duration(600).delay(300)}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterRow}>
            {FILTER_TABS.map((tab) => {
              const isActive = activeTab === tab.key;
              return (
                <TouchableOpacity
                  key={tab.key}
                  onPress={() => setActiveTab(tab.key)}
                  style={[styles.filterChip, isActive && styles.filterChipActive]}
                  activeOpacity={0.7}
                >
                  <Ionicons
                    name={isActive ? tab.icon : `${tab.icon}-outline`}
                    size={14}
                    color={isActive ? "#fff" : "#64748b"}
                  />
                  <Text style={[styles.filterChipText, isActive && styles.filterChipTextActive]}>
                    {tab.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </Animated.View>

        {isLoading ? (
          <View style={styles.centerContent}>
            <ActivityIndicator size="large" color="#1e3a8a" />
            <Text style={styles.loadingText}>Loading your trips...</Text>
          </View>
        ) : filtered.length === 0 ? (
          <Animated.View entering={FadeInUp.duration(600).delay(400)} style={styles.emptyState}>
            <View style={styles.emptyIcon}>
              <Ionicons name="bus-outline" size={44} color="#1e3a8a" />
            </View>
            <Text style={styles.emptyTitle}>No trips yet</Text>
            <Text style={styles.emptyDesc}>
              Your booked journeys will appear here.{'\n'}Start exploring routes!
            </Text>
            <TouchableOpacity onPress={() => router.push("/(customer)/")} style={styles.emptyBtn}>
              <Feather name="search" size={15} color="#fff" />
              <Text style={styles.emptyBtnText}>Browse Routes</Text>
            </TouchableOpacity>
          </Animated.View>
        ) : (
          <View style={styles.listWrap}>
            {filtered.map((booking, index) => (
              <BookingCard
                key={booking.id || booking.booking_reference}
                booking={booking}
                index={index}
                onPress={() => setSelectedBooking(booking)}
              />
            ))}
          </View>
        )}

        <Animated.View entering={FadeInUp.duration(600).delay(800)} style={styles.securityBadge}>
          <Ionicons name="shield-checkmark" size={14} color="#1e40af" />
          <Text style={styles.securityText}>SECURE & ENCRYPTED BOOKING</Text>
        </Animated.View>

        <View style={{ height: 40 }} />
      </ScrollView>

      {selectedBooking && (
        <TicketModal booking={selectedBooking} onClose={() => setSelectedBooking(null)} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f8fafc" },
  topCircle: {
    position: "absolute",
    top: -width * 0.4,
    right: -width * 0.2,
    width: width * 1.2,
    height: width * 1.2,
    borderRadius: width * 0.6,
    backgroundColor: "#e0f2fe",
  },
  header: { paddingTop: 56, paddingHorizontal: 24, paddingBottom: 4 },
  brandText: { color: "#1e3a8a", fontSize: 11, fontWeight: "900", letterSpacing: 2, marginBottom: 4 },
  headerTitle: { color: "#0f172a", fontSize: 28, fontWeight: "900", lineHeight: 36 },
  headerSub: { color: "#94a3b8", fontSize: 14, fontWeight: "500", marginTop: 4 },

  statsRow: { flexDirection: "row", gap: 10, paddingHorizontal: 24, marginTop: 24 },
  statCard: {
    flex: 1,
    backgroundColor: "#fff",
    borderRadius: 18,
    padding: 14,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#f1f5f9",
    shadowColor: "#000",
    shadowOpacity: 0.03,
    shadowRadius: 8,
    elevation: 1,
  },
  statIcon: {
    width: 34,
    height: 34,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 6,
  },
  statValue: { color: "#0f172a", fontSize: 20, fontWeight: "800" },
  statLabel: { color: "#94a3b8", fontSize: 9, marginTop: 1, fontWeight: "600", textTransform: "uppercase", letterSpacing: 0.3 },

  filterRow: { paddingHorizontal: 24, gap: 8, paddingVertical: 20 },
  filterChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  filterChipActive: { backgroundColor: "#1e3a8a", borderColor: "#1e3a8a" },
  filterChipText: { fontSize: 12, fontWeight: "600", color: "#64748b" },
  filterChipTextActive: { color: "#fff" },

  centerContent: { alignItems: "center", paddingVertical: 60 },
  loadingText: { marginTop: 12, color: "#64748b", fontSize: 14, fontWeight: "500" },

  emptyState: { alignItems: "center", paddingHorizontal: 40, paddingTop: 40 },
  emptyIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "#eff6ff",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  emptyTitle: { fontSize: 20, fontWeight: "900", color: "#0f172a" },
  emptyDesc: { color: "#64748b", textAlign: "center", marginTop: 8, lineHeight: 20, fontSize: 14 },
  emptyBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 20,
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

  listWrap: { paddingHorizontal: 16, paddingTop: 4, paddingBottom: 8 },

  card: {
    backgroundColor: "#fff",
    borderRadius: 20,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#f1f5f9",
    shadowColor: "#000",
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
    overflow: "hidden",
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#f8fafc",
  },
  cardRefRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  cardRef: { color: "#0f172a", fontSize: 13, fontWeight: "700", letterSpacing: 0.3 },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 10,
  },
  statusText: { fontSize: 10, fontWeight: "700", textTransform: "capitalize" },

  cardBody: {
    flexDirection: "row",
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
    alignItems: "center",
  },
  routeSection: { flex: 1, flexDirection: "row", alignItems: "center", gap: 8 },
  routeItem: { flexDirection: "row", alignItems: "center", gap: 8, flex: 1 },
  routeIcon: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  routeLabel: { color: "#94a3b8", fontSize: 9, fontWeight: "700", letterSpacing: 0.5 },
  routeValue: { color: "#0f172a", fontSize: 14, fontWeight: "700", marginTop: 1 },
  routeConnector: { alignItems: "center", width: 16 },
  connectorDot: { width: 5, height: 5, borderRadius: 2.5, backgroundColor: "#1e3a8a" },
  connectorLine: { width: 1.5, height: 20, backgroundColor: "#e2e8f0", marginVertical: 2 },
  cardMeta: { gap: 6, alignItems: "flex-end" },
  metaItem: { flexDirection: "row", alignItems: "center", gap: 4 },
  metaText: { color: "#64748b", fontSize: 11, fontWeight: "500" },

  cardFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: "#f8fafc",
  },
  footerLeft: { flexDirection: "row", alignItems: "center", gap: 6 },
  liveIndicator: { width: 6, height: 6, borderRadius: 3 },
  footerText: { color: "#94a3b8", fontSize: 11, fontWeight: "500" },
  amountRow: { flexDirection: "row", alignItems: "baseline", gap: 2 },
  amountLabel: { color: "#94a3b8", fontSize: 10, fontWeight: "700" },
  amountValue: { color: "#059669", fontSize: 16, fontWeight: "900" },

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

  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.6)", justifyContent: "flex-end" },
  modalSheet: {
    backgroundColor: "#f8fafc",
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    maxHeight: "92%",
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 32,
  },
  modalHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: "#cbd5e1",
    alignSelf: "center",
    marginBottom: 16,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 16,
  },
  modalLabel: { color: "#94a3b8", fontSize: 10, fontWeight: "800", letterSpacing: 1.5 },
  modalRef: { color: "#0f172a", fontSize: 20, fontWeight: "900", marginTop: 2 },
  modalClose: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: "#f1f5f9",
    alignItems: "center",
    justifyContent: "center",
  },
  modalQR: {
    alignItems: "center",
    backgroundColor: "#fff",
    borderRadius: 20,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  modalInfoCard: {
    backgroundColor: "#fff",
    borderRadius: 20,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  modalInfoRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 8,
  },
  modalInfoLabel: { color: "#64748b", fontSize: 13, flex: 1, marginLeft: 4 },
  modalInfoValue: { color: "#0f172a", fontSize: 13, fontWeight: "700", maxWidth: "50%", textAlign: "right" },
  modalDivider: { height: 1, backgroundColor: "#f8fafc" },
  modalStatusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 8,
  },
  modalStatusText: { fontSize: 10, fontWeight: "800", letterSpacing: 0.5 },
  modalActions: { flexDirection: "row", gap: 12, marginBottom: 16 },
  downloadBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "#1e3a8a",
    borderRadius: 16,
    paddingVertical: 14,
    shadowColor: "#1e3a8a",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 4,
  },
  downloadText: { color: "#fff", fontSize: 13, fontWeight: "800" },
  shareBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "#eff6ff",
    borderRadius: 16,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: "#dbeafe",
  },
  shareText: { color: "#1e3a8a", fontSize: 13, fontWeight: "800" },
});
