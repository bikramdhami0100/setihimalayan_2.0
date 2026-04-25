import React, { useEffect, useState, useContext } from "react";
import {
  View,
  Text,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Modal,
  StatusBar,
} from "react-native";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { router } from "expo-router";
import QRCode from "react-native-qrcode-svg";
import dayjs from "dayjs";
import { useBookings } from "../../hooks/useBookings";

const STATUS_COLORS = {
  confirmed: { bg: "#dcfce7", text: "#16a34a", dot: "#22c55e" },
  pending: { bg: "#fef9c3", text: "#ca8a04", dot: "#eab308" },
  cancelled: { bg: "#fee2e2", text: "#dc2626", dot: "#ef4444" },
  completed: { bg: "#e0f2fe", text: "#0284c7", dot: "#38bdf8" },
};

function BookingCard({ booking, onPress }) {
  const status = booking.status || "pending";
  const colors = STATUS_COLORS[status] || STATUS_COLORS.pending;
  const seats = Array.isArray(booking.selected_seats)
    ? booking.selected_seats.join(", ")
    : booking.selected_seats;

  return (
    <TouchableOpacity
      onPress={onPress}
      style={{
        backgroundColor: "#fff",
        borderRadius: 20,
        marginHorizontal: 20,
        marginBottom: 14,
        shadowColor: "#000",
        shadowOpacity: 0.07,
        shadowRadius: 10,
        elevation: 3,
        overflow: "hidden",
        borderWidth: 1,
        borderColor: "#e2e8f0",
      }}
    >
      {/* Card header */}
      <View style={{ backgroundColor: "#0f172a", paddingHorizontal: 16, paddingVertical: 12, flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
        <View>
          <Text style={{ color: "#64748b", fontSize: 9, fontWeight: "700", letterSpacing: 1.5 }}>BOOKING ID</Text>
          <Text style={{ color: "#f1f5f9", fontSize: 15, fontWeight: "800", letterSpacing: 1 }}>{booking.reference_number}</Text>
        </View>
        <View style={{ backgroundColor: colors.bg, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 }}>
          <Text style={{ color: colors.text, fontSize: 11, fontWeight: "700", textTransform: "capitalize" }}>{status}</Text>
        </View>
      </View>

      {/* Route */}
      <View style={{ padding: 16, flexDirection: "row", alignItems: "center", gap: 12 }}>
        <View style={{ flex: 1, gap: 6 }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
            <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: "#38bdf8" }} />
            <Text style={{ color: "#0f172a", fontSize: 14, fontWeight: "700" }}>
              {booking.origin || "—"}
            </Text>
          </View>
          <View style={{ width: 1, height: 14, backgroundColor: "#cbd5e1", marginLeft: 3.5 }} />
          <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
            <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: "#f97316" }} />
            <Text style={{ color: "#0f172a", fontSize: 14, fontWeight: "700" }}>
              {booking.destination || "—"}
            </Text>
          </View>
        </View>

        <View style={{ alignItems: "flex-end", gap: 4 }}>
          <Text style={{ color: "#64748b", fontSize: 11 }}>
            {booking.departure_time ? dayjs(booking.departure_time).format("DD MMM YYYY") : "—"}
          </Text>
          <Text style={{ color: "#64748b", fontSize: 11 }}>Seats: {seats}</Text>
          <Text style={{ color: "#f97316", fontSize: 15, fontWeight: "800" }}>NPR {booking.total_amount}</Text>
        </View>
      </View>

      {/* Footer */}
      <View style={{ borderTopWidth: 1, borderTopColor: "#f1f5f9", paddingHorizontal: 16, paddingVertical: 10, flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
          <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: colors.dot }} />
          <Text style={{ color: "#64748b", fontSize: 11 }}>
            Booked {booking.created_at ? dayjs(booking.created_at).fromNow() : ""}
          </Text>
        </View>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
          <Text style={{ color: "#38bdf8", fontSize: 12, fontWeight: "600" }}>View Ticket</Text>
          <Ionicons name="chevron-forward" size={14} color="#38bdf8" />
        </View>
      </View>
    </TouchableOpacity>
  );
}

function TicketModal({ booking, onClose }) {
  if (!booking) return null;
  const qrData = JSON.stringify({
    ref: booking.reference_number,
    seats: booking.selected_seats,
    amount: booking.total_amount,
  });

  return (
    <Modal visible animationType="slide" transparent>
      <View style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.75)", justifyContent: "flex-end" }}>
        <View style={{ backgroundColor: "#f8fafc", borderTopLeftRadius: 28, borderTopRightRadius: 28, maxHeight: "90%" }}>
          {/* Header */}
          <View style={{ backgroundColor: "#0f172a", borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 20, flexDirection: "row", justifyContent: "space-between" }}>
            <View>
              <Text style={{ color: "#64748b", fontSize: 9, fontWeight: "700", letterSpacing: 1.5 }}>E-TICKET</Text>
              <Text style={{ color: "#fff", fontSize: 18, fontWeight: "800" }}>{booking.reference_number}</Text>
            </View>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close-circle" size={28} color="#475569" />
            </TouchableOpacity>
          </View>

          <ScrollView style={{ padding: 20 }}>
            {/* QR Code */}
            <View style={{ alignItems: "center", backgroundColor: "#fff", borderRadius: 20, padding: 24, marginBottom: 16, borderWidth: 1, borderColor: "#e2e8f0" }}>
              <QRCode value={qrData} size={160} color="#0f172a" backgroundColor="#fff" />
              <Text style={{ marginTop: 12, color: "#64748b", fontSize: 11, letterSpacing: 2 }}>{booking.reference_number}</Text>
            </View>

            {/* Details */}
            {[
              { label: "From", value: booking.origin || "—" },
              { label: "To", value: booking.destination || "—" },
              { label: "Date", value: booking.departure_time ? dayjs(booking.departure_time).format("DD MMM YYYY, hh:mm A") : "—" },
              { label: "Seats", value: Array.isArray(booking.selected_seats) ? booking.selected_seats.join(", ") : booking.selected_seats },
              { label: "Total Paid", value: `NPR ${booking.total_amount}` },
              { label: "Status", value: booking.status },
            ].map((row, i) => (
              <View key={i} style={{ flexDirection: "row", justifyContent: "space-between", paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: "#f1f5f9" }}>
                <Text style={{ color: "#64748b", fontSize: 13 }}>{row.label}</Text>
                <Text style={{ color: "#0f172a", fontSize: 13, fontWeight: "700" }}>{row.value}</Text>
              </View>
            ))}

            {/* Actions */}
            <View style={{ flexDirection: "row", gap: 12, marginTop: 20, marginBottom: 40 }}>
              <TouchableOpacity
                style={{ flex: 1, backgroundColor: "#0f172a", borderRadius: 14, padding: 14, alignItems: "center", flexDirection: "row", justifyContent: "center", gap: 8 }}
                onPress={onClose}
              >
                <Ionicons name="download-outline" size={18} color="#38bdf8" />
                <Text style={{ color: "#f1f5f9", fontWeight: "700" }}>Download PDF</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={{ flex: 1, backgroundColor: "#e0f2fe", borderRadius: 14, padding: 14, alignItems: "center", flexDirection: "row", justifyContent: "center", gap: 8 }}
              >
                <Ionicons name="share-outline" size={18} color="#0284c7" />
                <Text style={{ color: "#0284c7", fontWeight: "700" }}>Share</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>
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

  const filtered = activeTab === "all"
    ? userBookings
    : userBookings.filter((b) => b.status === activeTab);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#f8fafc" }}>
      <StatusBar barStyle="dark-content" />

      {/* Header */}
      <View style={{ backgroundColor: "#0f172a", paddingHorizontal: 20, paddingTop: 16, paddingBottom: 24 }}>
        <Text style={{ color: "#94a3b8", fontSize: 11, fontWeight: "700", letterSpacing: 1.5, textTransform: "uppercase" }}>Your Journeys</Text>
        <Text style={{ color: "#f1f5f9", fontSize: 24, fontWeight: "800", marginTop: 4 }}>My Trips</Text>

        {/* Filter tabs */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 16 }} contentContainerStyle={{ gap: 8 }}>
          {["all", "confirmed", "pending", "completed", "cancelled"].map((tab) => (
            <TouchableOpacity
              key={tab}
              onPress={() => setActiveTab(tab)}
              style={{
                paddingHorizontal: 16,
                paddingVertical: 7,
                borderRadius: 20,
                backgroundColor: activeTab === tab ? "#38bdf8" : "#1e293b",
                borderWidth: 1,
                borderColor: activeTab === tab ? "#38bdf8" : "#334155",
              }}
            >
              <Text style={{
                color: activeTab === tab ? "#0f172a" : "#94a3b8",
                fontSize: 12,
                fontWeight: "700",
                textTransform: "capitalize",
              }}>
                {tab === "all" ? "All Trips" : tab}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* List */}
      {isLoading ? (
        <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
          <ActivityIndicator size="large" color="#38bdf8" />
          <Text style={{ marginTop: 12, color: "#64748b" }}>Loading your trips...</Text>
        </View>
      ) : filtered.length === 0 ? (
        <View style={{ flex: 1, justifyContent: "center", alignItems: "center", paddingHorizontal: 40 }}>
          <View style={{ width: 80, height: 80, backgroundColor: "#e0f2fe", borderRadius: 40, alignItems: "center", justifyContent: "center", marginBottom: 16 }}>
            <Ionicons name="bus-outline" size={40} color="#38bdf8" />
          </View>
          <Text style={{ fontSize: 18, fontWeight: "800", color: "#0f172a", textAlign: "center" }}>No trips yet</Text>
          <Text style={{ color: "#64748b", textAlign: "center", marginTop: 8, lineHeight: 20 }}>
            Your booked journeys will appear here. Start exploring routes!
          </Text>
          <TouchableOpacity
            onPress={() => router.push("/(customer)/")}
            style={{ marginTop: 20, backgroundColor: "#0f172a", paddingHorizontal: 28, paddingVertical: 14, borderRadius: 16 }}
          >
            <Text style={{ color: "#38bdf8", fontWeight: "700" }}>Book a Bus</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <ScrollView style={{ flex: 1, paddingTop: 20 }} showsVerticalScrollIndicator={false}>
          {filtered.map((booking) => (
            <BookingCard
              key={booking.id || booking.reference_number}
              booking={booking}
              onPress={() => setSelectedBooking(booking)}
            />
          ))}
          <View style={{ height: 20 }} />
        </ScrollView>
      )}

      {/* Ticket Modal */}
      {selectedBooking && (
        <TicketModal booking={selectedBooking} onClose={() => setSelectedBooking(null)} />
      )}
    </SafeAreaView>
  );
}
