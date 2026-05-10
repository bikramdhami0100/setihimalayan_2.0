import React, { useState } from "react";
import {
  View,
  Text,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  StatusBar,
  StyleSheet,
} from "react-native";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import Animated, { FadeInUp } from "react-native-reanimated";
import { useBookings } from "../../hooks/useBookings";
import { Snackbar } from "react-native-paper";

export default function PassengerDetails() {
  const { scheduleId, seats = "", total = "0" } = useLocalSearchParams();
  const selectedSeats = seats ? seats.split(",") : [];

  const { initiateBooking, isLoading } = useBookings();
  const [visible, setVisible] = useState(false);
  const [message, setMessage] = useState("");

  const [passengers, setPassengers] = useState(
    selectedSeats.map((seat) => ({ seat, name: "", age: "", gender: "Male" }))
  );

  const updatePassenger = (index, field, value) => {
    const newPassengers = [...passengers];
    newPassengers[index][field] = value;
    setPassengers(newPassengers);
  };

  const handleProceed = async () => {
    const missingInfo = passengers.some((p) => !p.name.trim() || !p.age.trim());
    if (missingInfo) {
      setMessage("Please fill all passenger details");
      setVisible(true);
      return;
    }

    const details = passengers.map((p) => ({
      seat_number: p.seat,
      name: p.name.trim(),
      age: parseInt(p.age) || 25,
      gender: p.gender,
    }));

    try {
      const result = await initiateBooking(scheduleId, selectedSeats, details, "");
      if (result.success) {
        router.push({
          pathname: "/(customer)/payment",
          params: {
            bookingId: result?.booking?.booking_id,
            amount: result?.booking?.total_amount,
            reference: result?.booking?.booking_reference,
          },
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
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#1e3a8a" />

      <View style={styles.topCircle} />

      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
      >
        <ScrollView
          showsVerticalScrollIndicator={false}
          bounces={false}
          contentContainerStyle={{ paddingBottom: 120 }}
        >
          {/* ─── HEADER ─── */}
          <Animated.View entering={FadeInUp.duration(800).delay(100)} style={styles.header}>
            <View style={styles.headerTop}>
              <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
                <Ionicons name="arrow-back" size={22} color="#1e3a8a" />
              </TouchableOpacity>
              <View style={{ flex: 1, marginLeft: 12 }}>
                <Text style={styles.brandText}>SETI HIMALAYAN</Text>
                <Text style={styles.headerTitle}>Traveler Details</Text>
                <Text style={styles.headerSubtext}>
                  Please enter details as they appear on ID
                </Text>
              </View>
              <View style={styles.seatBadge}>
                <MaterialCommunityIcons name="seat" size={14} color="#1e3a8a" />
                <Text style={styles.seatBadgeText}>
                  {selectedSeats.length} {selectedSeats.length > 1 ? "Seats" : "Seat"}
                </Text>
              </View>
            </View>

            {/* Selected seats strip */}
            <View style={styles.seatsStrip}>
              {selectedSeats.map((seat, idx) => (
                <View key={seat} style={styles.seatChip}>
                  <Text style={styles.seatChipLabel}>SEAT</Text>
                  <Text style={styles.seatChipValue}>{seat}</Text>
                </View>
              ))}
            </View>
          </Animated.View>

          {/* ─── PASSENGER DETAILS SECTION ─── */}
          <Animated.View entering={FadeInUp.duration(800).delay(200)} style={styles.sectionHeader}>
            <View style={styles.sectionBar} />
            <Text style={styles.sectionTitle}>Passenger Information</Text>
          </Animated.View>

          {passengers.map((passenger, index) => (
            <Animated.View
              key={passenger.seat}
              entering={FadeInUp.duration(800).delay(300 + index * 100)}
              style={styles.passengerCard}
            >
              {/* Passenger header */}
              <View style={styles.passengerHeader}>
                <View style={styles.passengerNum}>
                  <Text style={styles.passengerNumText}>{index + 1}</Text>
                </View>
                <View style={{ flex: 1, marginLeft: 12 }}>
                  <Text style={styles.passengerTitle}>
                    Seat {passenger.seat}
                  </Text>
                  <Text style={styles.passengerSubtitle}>
                    {index === 0 ? "Primary Passenger" : "Additional Passenger"}
                  </Text>
                </View>
                {index === 0 && (
                  <View style={styles.primaryBadge}>
                    <Ionicons name="star" size={10} color="#d97706" />
                    <Text style={styles.primaryBadgeText}>PRIMARY</Text>
                  </View>
                )}
              </View>

              {/* Full Name */}
              <View style={styles.fieldGroup}>
                <Text style={styles.fieldLabel}>Full Name</Text>
                <View style={styles.inputWrap}>
                  <View style={styles.inputIconWrap}>
                    <Ionicons name="person-outline" size={16} color="#64748b" />
                  </View>
                  <TextInput
                    style={styles.textInput}
                    placeholder="e.g. Biraj Bhatta"
                    placeholderTextColor="#94a3b8"
                    value={passenger.name}
                    onChangeText={(text) => updatePassenger(index, "name", text)}
                    underlineColorAndroid="transparent"
                    selectionColor="#1e3a8a"
                  />
                </View>
              </View>

              {/* Age & Gender row */}
              <View style={styles.row}>
                <View style={styles.halfField}>
                  <Text style={styles.fieldLabel}>Age</Text>
                  <View style={styles.inputWrap}>
                    <View style={styles.inputIconWrap}>
                      <Ionicons name="calendar-number-outline" size={16} color="#64748b" />
                    </View>
                    <TextInput
                      style={styles.textInput}
                      placeholder="Age"
                      placeholderTextColor="#94a3b8"
                      keyboardType="numeric"
                      maxLength={3}
                      value={passenger.age}
                      onChangeText={(text) => updatePassenger(index, "age", text)}
                      underlineColorAndroid="transparent"
                      selectionColor="#1e3a8a"
                    />
                  </View>
                </View>

                <View style={styles.halfFieldGender}>
                  <Text style={styles.fieldLabel}>Gender</Text>
                  <View style={styles.genderSelector}>
                    {["Male", "Female"].map((g) => (
                      <TouchableOpacity
                        key={g}
                        style={[
                          styles.genderOption,
                          passenger.gender === g && styles.genderOptionActive,
                        ]}
                        onPress={() => updatePassenger(index, "gender", g)}
                        activeOpacity={0.7}
                      >
                        <Ionicons
                          name={
                            g === "Male" ? "man-outline" : "woman-outline"
                          }
                          size={14}
                          color={
                            passenger.gender === g ? "#fff" : "#94a3b8"
                          }
                        />
                        <Text
                          style={[
                            styles.genderText,
                            passenger.gender === g && styles.genderTextActive,
                          ]}
                        >
                          {g}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              </View>
            </Animated.View>
          ))}

          {/* ─── CONTACT INFO SECTION ─── */}
          <Animated.View entering={FadeInUp.duration(800).delay(700)} style={[styles.sectionHeader, { marginTop: 8 }]}>
            <View style={[styles.sectionBar, { backgroundColor: "#059669" }]} />
            <Text style={styles.sectionTitle}>Contact Information</Text>
          </Animated.View>

          <Animated.View entering={FadeInUp.duration(800).delay(800)} style={styles.contactCard}>
            <View style={styles.contactHeader}>
              <View style={styles.contactIconWrap}>
                <Ionicons name="mail-outline" size={18} color="#059669" />
              </View>
              <View style={{ flex: 1, marginLeft: 12 }}>
                <Text style={styles.contactTitle}>Booking Confirmation</Text>
                <Text style={styles.contactSubtitle}>
                  We'll send the ticket to these details
                </Text>
              </View>
            </View>

            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>Email Address</Text>
              <View style={styles.inputWrap}>
                <View style={styles.inputIconWrap}>
                  <Ionicons name="mail-outline" size={16} color="#64748b" />
                </View>
                <TextInput
                  style={styles.textInput}
                  placeholder="traveler@example.com"
                  placeholderTextColor="#94a3b8"
                  keyboardType="email-address"
                  underlineColorAndroid="transparent"
                  selectionColor="#1e3a8a"
                />
              </View>
            </View>

            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>Mobile Number</Text>
              <View style={styles.phoneRow}>
                <View style={styles.countryCode}>
                  <Text style={styles.countryCodeText}>+977</Text>
                </View>
                <View style={[styles.inputWrap, { flex: 1 }]}>
                  <View style={styles.inputIconWrap}>
                    <Ionicons name="call-outline" size={16} color="#64748b" />
                  </View>
                  <TextInput
                    style={styles.textInput}
                    placeholder="98XXXXXXXX"
                    placeholderTextColor="#94a3b8"
                    keyboardType="phone-pad"
                    underlineColorAndroid="transparent"
                    selectionColor="#1e3a8a"
                  />
                </View>
              </View>
            </View>
          </Animated.View>

          {/* ─── INFO NOTE ─── */}
          <Animated.View entering={FadeInUp.duration(800).delay(900)} style={styles.infoNote}>
            <Ionicons name="shield-checkmark" size={14} color="#1e40af" />
            <Text style={styles.infoNoteText}>
              Your information is secure and encrypted
            </Text>
          </Animated.View>
        </ScrollView>

        {/* ─── FIXED BOTTOM BAR ─── */}
        <View style={styles.bottomBar}>
          <View style={styles.bottomBarInner}>
            <View style={styles.fareSection}>
              <Text style={styles.fareLabel}>Total Payable</Text>
              <Text style={styles.fareValue}>NPR {parseInt(total).toLocaleString()}</Text>
              <Text style={styles.perSeatText}>
                for {selectedSeats.length} seat{selectedSeats.length > 1 ? "s" : ""}
              </Text>
            </View>

            <TouchableOpacity
              style={[styles.bookBtn, isLoading && styles.bookBtnDisabled]}
              onPress={handleProceed}
              disabled={isLoading}
              activeOpacity={0.85}
            >
              {isLoading ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <>
                  <Text style={styles.bookBtnText}>Book Now</Text>
                  <Ionicons name="arrow-forward" size={18} color="#fff" />
                </>
              )}
            </TouchableOpacity>
          </View>

          <View style={styles.bottomHint}>
            <Ionicons name="information-circle" size={11} color="#94a3b8" />
            <Text style={styles.hintText}>Fill all details to proceed</Text>
          </View>
        </View>

        <Snackbar
          visible={visible}
          onDismiss={() => setVisible(false)}
          action={{
            label: "OK",
            onPress: () => setVisible(false),
            labelStyle: { color: "#ff8a4c", fontWeight: "800" },
          }}
          style={styles.snackbar}
        >
          {message}
        </Snackbar>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const { width } = require("react-native").Dimensions.get("window");

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

  // Header
  header: {
    paddingHorizontal: 20,
    paddingTop: Platform.OS === "ios" ? 8 : 16,
    paddingBottom: 4,
  },
  headerTop: {
    flexDirection: "row",
    alignItems: "flex-start",
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
  headerSubtext: {
    color: "#94a3b8",
    fontSize: 12,
    fontWeight: "500",
    marginTop: 2,
  },
  seatBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#eff6ff",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#dbeafe",
  },
  seatBadgeText: {
    fontSize: 11,
    fontWeight: "800",
    color: "#1e3a8a",
  },

  // Seats strip
  seatsStrip: {
    flexDirection: "row",
    gap: 8,
    marginTop: 14,
    paddingBottom: 4,
  },
  seatChip: {
    backgroundColor: "#fff",
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  seatChipLabel: {
    fontSize: 8,
    fontWeight: "800",
    color: "#94a3b8",
    letterSpacing: 0.5,
  },
  seatChipValue: {
    fontSize: 14,
    fontWeight: "800",
    color: "#1e3a8a",
    marginTop: 1,
  },

  // Section Header
  sectionHeader: {
    paddingHorizontal: 24,
    marginTop: 20,
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

  // Passenger Card
  passengerCard: {
    marginHorizontal: 20,
    backgroundColor: "#fff",
    borderRadius: 24,
    padding: 20,
    marginBottom: 14,
    shadowColor: "#1e3a8a",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 3,
    borderWidth: 1,
    borderColor: "#f1f5f9",
  },
  passengerHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#f1f5f9",
  },
  passengerNum: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: "#1e3a8a",
    alignItems: "center",
    justifyContent: "center",
  },
  passengerNumText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "800",
  },
  passengerTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: "#0f172a",
  },
  passengerSubtitle: {
    fontSize: 11,
    color: "#94a3b8",
    fontWeight: "500",
    marginTop: 1,
  },
  primaryBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#fffbeb",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#fde68a",
  },
  primaryBadgeText: {
    fontSize: 8,
    fontWeight: "900",
    color: "#d97706",
    letterSpacing: 0.5,
  },

  // Fields
  fieldGroup: {
    marginBottom: 14,
  },
  fieldLabel: {
    fontSize: 10,
    fontWeight: "800",
    color: "#64748b",
    letterSpacing: 0.5,
    marginBottom: 6,
    textTransform: "uppercase",
  },
  inputWrap: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f8fafc",
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: "#e2e8f0",
    paddingHorizontal: 12,
  },
  inputIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 8,
  },
  textInput: {
    flex: 1,
    color: "#0f172a",
    fontSize: 15,
    fontWeight: "600",
    paddingVertical: 14,
    padding: 0,
    outlineColor: "transparent",
  },

  // Row
  row: {
    flexDirection: "row",
    gap: 12,
  },
  halfField: {
    flex: 1,
  },
  halfFieldGender: {
    flex: 1.5,
  },

  // Gender Selector
  genderSelector: {
    flexDirection: "row",
    backgroundColor: "#f8fafc",
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: "#e2e8f0",
    padding: 4,
    gap: 4,
  },
  genderOption: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
    paddingVertical: 12,
    borderRadius: 11,
  },
  genderOptionActive: {
    backgroundColor: "#1e3a8a",
    shadowColor: "#1e3a8a",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  genderText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#94a3b8",
  },
  genderTextActive: {
    color: "#fff",
  },

  // Contact Card
  contactCard: {
    marginHorizontal: 20,
    backgroundColor: "#fff",
    borderRadius: 24,
    padding: 20,
    marginBottom: 14,
    shadowColor: "#059669",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 3,
    borderWidth: 1,
    borderColor: "#f1f5f9",
  },
  contactHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#f1f5f9",
  },
  contactIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: "#ecfdf5",
    alignItems: "center",
    justifyContent: "center",
  },
  contactTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: "#0f172a",
  },
  contactSubtitle: {
    fontSize: 11,
    color: "#94a3b8",
    fontWeight: "500",
    marginTop: 1,
  },

  // Phone
  phoneRow: {
    flexDirection: "row",
    gap: 8,
  },
  countryCode: {
    backgroundColor: "#f8fafc",
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: "#e2e8f0",
    paddingHorizontal: 14,
    justifyContent: "center",
  },
  countryCodeText: {
    fontSize: 14,
    fontWeight: "800",
    color: "#0f172a",
  },

  // Info Note
  infoNote: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    backgroundColor: "#eff6ff",
    alignSelf: "center",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 100,
    borderWidth: 1,
    borderColor: "#dbeafe",
    marginTop: 8,
  },
  infoNoteText: {
    fontSize: 10,
    fontWeight: "700",
    color: "#1e40af",
  },

  // Bottom Bar
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
  bookBtn: {
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
  bookBtnDisabled: {
    backgroundColor: "#cbd5e1",
    elevation: 0,
    shadowOpacity: 0,
  },
  bookBtnText: {
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

  // Snackbar
  snackbar: {
    backgroundColor: "#1e293b",
    borderRadius: 12,
    marginBottom: 100,
  },
});
