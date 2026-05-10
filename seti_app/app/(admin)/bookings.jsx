import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  View, Text, SafeAreaView, ScrollView, TouchableOpacity,
  ActivityIndicator, Alert, RefreshControl,
  KeyboardAvoidingView, Platform, StatusBar, StyleSheet,
} from "react-native";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { Portal, Modal, TextInput, Searchbar, Dialog, Button } from "react-native-paper";
import { Calendar } from "react-native-calendars";
import * as Print from "expo-print";
import * as Sharing from "expo-sharing";
import * as FileSystem from "expo-file-system";
import Animated, { FadeInDown } from "react-native-reanimated";
import {
  createBooking, deleteBooking, updateBooking, getBookingById,
  getAllBookings, downloadTicket, cancelBooking
} from "../../api/bookings";
import { useAdminData } from "../../context/AdminContext";
import PdfViewer from "../../components/PdfViewer";

const BOOKING_STATUSES = ["pending_payment", "confirmed", "cancelled", "expired", "refunded"];
const PAYMENT_STATUSES = ["unpaid", "paid", "refunded", "partial_refund", "pending"];
const PAYMENT_METHODS = ["cash", "card", "online", "bank_transfer", "other"];
const PAGE_SIZES = [10, 25, 50, 100];

const STATUS_CFG = {
  confirmed:      { dot: { backgroundColor: "#22C55E" }, badge: { backgroundColor: "#DCFCE7" }, text: { color: "#15803D" }, label: "CONFIRMED" },
  pending_payment:{ dot: { backgroundColor: "#EAB308" }, badge: { backgroundColor: "#FEF9C3" }, text: { color: "#A16207" }, label: "PENDING" },
  cancelled:      { dot: { backgroundColor: "#EF4444" }, badge: { backgroundColor: "#FEE2E2" }, text: { color: "#B91C1C" }, label: "CANCELLED" },
  expired:        { dot: { backgroundColor: "#64748B" }, badge: { backgroundColor: "#F1F5F9" }, text: { color: "#334155" }, label: "EXPIRED" },
  refunded:       { dot: { backgroundColor: "#A855F7" }, badge: { backgroundColor: "#F3E8FF" }, text: { color: "#7E22CE" }, label: "REFUNDED" },
};

const PAYMENT_CFG = {
  paid:            { dot: { backgroundColor: "#22C55E" }, badge: { backgroundColor: "#DCFCE7" }, text: { color: "#15803D" }, label: "PAID" },
  unpaid:          { dot: { backgroundColor: "#EF4444" }, badge: { backgroundColor: "#FEE2E2" }, text: { color: "#B91C1C" }, label: "UNPAID" },
  refunded:        { dot: { backgroundColor: "#A855F7" }, badge: { backgroundColor: "#F3E8FF" }, text: { color: "#7E22CE" }, label: "REFUNDED" },
  partial_refund:  { dot: { backgroundColor: "#EAB308" }, badge: { backgroundColor: "#FEF9C3" }, text: { color: "#A16207" }, label: "PARTIAL" },
  pending:         { dot: { backgroundColor: "#EAB308" }, badge: { backgroundColor: "#FEF9C3" }, text: { color: "#A16207" }, label: "PENDING" },
};

const COLUMNS = [
  { key: "booking_reference", label: "Reference", sortable: true, flex: 0.9 },
  { key: "user_name",         label: "Passenger", sortable: true, flex: 0.9 },
  { key: "route",             label: "Route",     sortable: true, flex: 1.1 },
  { key: "departure_time",    label: "Departure", sortable: true, flex: 0.9 },
  { key: "bus_number",        label: "Bus",       sortable: true, flex: 0.7 },
  { key: "seats",             label: "Seats",     sortable: true, flex: 0.5 },
  { key: "total_amount",      label: "Fare",      sortable: true, flex: 0.7 },
  { key: "payment_status",    label: "Payment",   sortable: true, flex: 0.8 },
  { key: "status",            label: "Status",    sortable: true, flex: 0.8 },
  { key: "created_at",        label: "Booked",    sortable: true, flex: 0.8 },
  { key: "actions",           label: "Actions",   sortable: false, flex: 1.4 },
];

const EMPTY_FORM = {
  user_id: "",
  schedule_id: "",
  seats: "1",
  seat_numbers: "",
  boarding_point: "",
  dropping_point: "",
  fare: "",
  discount: "0",
  total_amount: "",
  payment_method: "cash",
  payment_status: "unpaid",
  status: "pending_payment",
  notes: "",
  passenger_name: "",
  passenger_phone: "",
};

const formatDate = (d) => {
  if (!d) return "\u2014";
  const dt = new Date(d);
  if (isNaN(dt.getTime())) return "\u2014";
  return dt.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
};

const formatDateTime = (d) => {
  if (!d) return "\u2014";
  const dt = new Date(d);
  if (isNaN(dt.getTime())) return "\u2014";
  return dt.toLocaleDateString("en-US", {
    year: "numeric", month: "short", day: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
};

const getRouteLabel = (item) => {
  const o = item.origin || item.route_origin || "";
  const d = item.destination || item.route_destination || "";
  return o && d ? `${o} \u2192 ${d}` : "\u2014";
};

const getAmount = (item) => {
  const v = item.total_amount ?? item.total_fare ?? item.fare ?? 0;
  return `Rs. ${Number(v).toLocaleString()}`;
};

const itemToForm = (item) => ({
  user_id:        item.user_id ? String(item.user_id) : "",
  schedule_id:    item.schedule_id ? String(item.schedule_id) : "",
  seats:          String(item.seats ?? 1),
  seat_numbers:   Array.isArray(item.seat_numbers) ? item.seat_numbers.join(", ") : (item.seat_numbers || ""),
  boarding_point: item.boarding_point || "",
  dropping_point: item.dropping_point || "",
  fare:           String(item.fare ?? ""),
  discount:       String(item.discount ?? "0"),
  total_amount:   String(item.total_amount ?? item.total_fare ?? ""),
  payment_method: item.payment_method || "cash",
  payment_status: item.payment_status || "unpaid",
  status:         item.status ?? "pending_payment",
  notes:          item.notes || "",
  passenger_name: item.passenger_name || item.user_name || "",
  passenger_phone: item.passenger_phone || item.user_phone || "",
});

const toPayload = (f) => ({
  user_id:        parseInt(f.user_id) || null,
  schedule_id:    parseInt(f.schedule_id) || null,
  seats:          parseInt(f.seats) || 1,
  seat_numbers:   f.seat_numbers ? f.seat_numbers.split(",").map(s => s.trim()).filter(Boolean) : [],
  boarding_point: f.boarding_point || null,
  dropping_point: f.dropping_point || null,
  fare:           parseFloat(f.fare) || null,
  discount:       parseFloat(f.discount) || 0,
  total_amount:   parseFloat(f.total_amount) || parseFloat(f.fare) || 0,
  payment_method: f.payment_method || "cash",
  payment_status: f.payment_status || "unpaid",
  status:         f.status,
  notes:          f.notes || null,
});

const buildHTML = (bookings) => `<!DOCTYPE html><html><head><meta charset="utf-8"/>
<style>
  body{font-family:Arial,sans-serif;padding:28px;color:#1e293b}
  h1{color:#1e3a8a;font-size:22px;font-weight:900;margin:0}
  p{color:#64748b;font-size:12px;margin:4px 0 24px}
  table{width:100%;border-collapse:collapse;font-size:10px}
  th{background:#1e3a8a;color:#fff;padding:8px 10px;text-align:left;font-size:9px;text-transform:uppercase}
  td{padding:7px 10px;border-bottom:1px solid #e2e8f0}
  tr:nth-child(even) td{background:#f8fafc}
  .badge{display:inline-block;padding:2px 8px;border-radius:12px;font-size:9px;font-weight:700}
  .confirmed{background:#dcfce7;color:#16a34a}
  .pending_payment{background:#fef9c3;color:#ca8a04}
  .cancelled{background:#fee2e2;color:#dc2626}
  .expired{background:#f1f5f9;color:#475569}
  .refunded{background:#f3e8ff;color:#7e22ce}
  .paid{background:#dcfce7;color:#16a34a}
  .unpaid{background:#fee2e2;color:#dc2626}
</style></head><body>
<h1>Booking Report</h1>
<p>Generated: ${new Date().toLocaleString()} \u00B7 ${bookings.length} entries</p>
<table>
  <thead><tr>
    <th>#</th><th>Ref</th><th>Passenger</th><th>Route</th><th>Departure</th>
    <th>Bus</th><th>Seats</th><th>Amount</th><th>Payment</th><th>Status</th>
  </tr></thead>
  <tbody>
    ${bookings.map((b, i) => `<tr>
      <td>${i+1}</td>
      <td><strong>${b.booking_reference}</strong></td>
      <td>${b.user_name || b.passenger_name || "\u2014"}</td>
      <td>${getRouteLabel(b)}</td>
      <td>${formatDateTime(b.departure_time)}</td>
      <td>${b.bus_number || "\u2014"}</td>
      <td>${b.seats || "\u2014"}</td>
      <td>${getAmount(b)}</td>
      <td><span class="badge ${b.payment_status || "pending"}">${b.payment_status || "pending"}</span></td>
      <td><span class="badge ${b.status}">${b.status}</span></td>
    </tr>`).join("")}
  </tbody>
</table></body></html>`;

const buildCSV = (bookings) => {
  const H = ["ID","Reference","Passenger","Phone","Route","Departure",
    "Bus","Seats","Fare","Discount","Total","Payment Method","Payment Status",
    "Booking Status","Boarding Point","Dropping Point","Notes","Created","Confirmed"];
  const E = (v) => `"${String(v ?? "").replace(/"/g, '""')}"`;
  const rows = bookings.map((b) => [
    b.id, b.booking_reference, b.user_name || b.passenger_name, b.passenger_phone || b.user_phone,
    getRouteLabel(b), formatDateTime(b.departure_time), b.bus_number, b.seats, b.fare,
    b.discount, b.total_amount ?? b.total_fare, b.payment_method, b.payment_status,
    b.status, b.boarding_point, b.dropping_point, b.notes,
    formatDateTime(b.created_at), formatDateTime(b.confirmed_at),
  ].map(E).join(","));
  return [H.map(E).join(","), ...rows].join("\r\n");
};

const buildXLS = (bookings) => {
  const headers = ["ID","Reference","Passenger","Phone","Route","Departure",
    "Bus","Seats","Fare","Discount","Total","Payment Method","Payment Status",
    "Booking Status","Boarding Point","Dropping Point","Notes","Created","Confirmed"];
  const rows = bookings.map((b) => [
    b.id, b.booking_reference, b.user_name || b.passenger_name, b.passenger_phone || b.user_phone || "",
    getRouteLabel(b), formatDateTime(b.departure_time), b.bus_number || "", b.seats || "",
    b.fare || "", b.discount || "", b.total_amount ?? b.total_fare ?? "",
    b.payment_method || "", b.payment_status || "", b.status || "",
    b.boarding_point || "", b.dropping_point || "", b.notes || "",
    formatDateTime(b.created_at), formatDateTime(b.confirmed_at),
  ]);
  const allRows = [headers, ...rows];
  const maxCols = Math.max(...allRows.map((r) => r.length));
  const pad = (r) => { const a = [...r]; while (a.length < maxCols) a.push(""); return a; };
  const esc = (v) => String(v ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<?mso-application progid="Excel.Sheet"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:o="urn:schemas-microsoft-com:office:office"
 xmlns:x="urn:schemas-microsoft-com:office:excel"
 xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:html="http://www.w3.org/TR/REC-html40">
 <Worksheet ss:Name="Bookings">
  <Table>
   ${allRows.map((r) => `    <Row>${pad(r).map((c) => ` <Cell><Data ss:Type="String">${esc(c)}</Data></Cell>`).join("")}</Row>`).join("\n")}
  </Table>
 </Worksheet>
</Workbook>`;
  return xml;
};

const shareFile = async (path, mimeType, dialogTitle) => {
  let uri = path;
  if (Platform.OS === "android") {
    try { const contentUri = await FileSystem.getContentUriAsync(path); uri = contentUri.uri; }
    catch { uri = path; }
  }
  await Sharing.shareAsync(uri, { mimeType, dialogTitle });
};

const downloadBlob = (blob, filename) => {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
};

const exportCSV = async (bookings) => {
  const csv = buildCSV(bookings);
  if (Platform.OS === "web") {
    downloadBlob(new Blob([csv], { type: "text/csv;charset=utf-8;" }), `bookings_${Date.now()}.csv`);
    return;
  }
  const path = `${FileSystem.cacheDirectory}bookings_${Date.now()}.csv`;
  await FileSystem.writeAsStringAsync(path, csv, { encoding: FileSystem.EncodingType.UTF8 });
  await shareFile(path, "text/csv", "Export CSV");
};

const exportPDF = async (bookings) => {
  const html = buildHTML(bookings);
  if (Platform.OS === "web") {
    try {
      const { uri } = await Print.printToFileAsync({ html });
      if (uri) {
        const anchor = document.createElement("a"); anchor.href = uri;
        anchor.download = `bookings_${Date.now()}.pdf`;
        document.body.appendChild(anchor); anchor.click(); anchor.remove();
        return;
      }
    } catch { }
    await Print.printAsync({ html });
    return;
  }
  const { uri } = await Print.printToFileAsync({ html });
  await shareFile(uri, "application/pdf", "Export PDF");
};

const exportXLS = async (bookings) => {
  const xls = buildXLS(bookings);
  if (Platform.OS === "web") {
    downloadBlob(new Blob([xls], { type: "application/vnd.ms-excel;charset=utf-8" }), `bookings_${Date.now()}.xls`);
    return;
  }
  const path = `${FileSystem.cacheDirectory}bookings_${Date.now()}.xls`;
  await FileSystem.writeAsStringAsync(path, xls, { encoding: FileSystem.EncodingType.UTF8 });
  await shareFile(path, "application/vnd.ms-excel", "Export Excel");
};

const SectionLabel = ({ children }) => (
  <Text style={styles.sectionLabel}>{children}</Text>
);

const Field = ({ style, error, ...props }) => (
  <View style={{ marginBottom: 12 }}>
    <TextInput
      mode="outlined"
      error={!!error}
      textColor="#0f172a"
      style={[{ backgroundColor: "#fff" }, style]}
      {...props}
    />
    {error ? <Text style={styles.fieldError}>{error}</Text> : null}
  </View>
);

const DatePicker = ({ label, value, onChange, minDate, error }) => {
  const [showCalendar, setShowCalendar] = useState(false);
  const marked = value ? { [value]: { selected: true, selectedColor: "#1e3a8a" } } : {};
  return (
    <View style={{ marginBottom: 12 }}>
      <TouchableOpacity onPress={() => setShowCalendar(true)}
        style={[styles.datePickerBtn, error ? { borderColor: "#ef4444" } : undefined]}>
        <Text style={styles.datePickerText}>{value ? value : `Select ${label}`}</Text>
        <Ionicons name="calendar-outline" size={18} color={error ? "#ef4444" : "#64748b"} />
      </TouchableOpacity>
      {error ? <Text style={styles.fieldError}>{error}</Text> : null}
      <Portal>
        <Modal visible={showCalendar} onDismiss={() => setShowCalendar(false)}
          contentContainerStyle={{ backgroundColor: "#fff", margin: 20, borderRadius: 20, padding: 16 }}>
          <Calendar onDayPress={(day) => { onChange(day.dateString); setShowCalendar(false); }}
            markedDates={marked} minDate={minDate}
            theme={{ selectedDayBackgroundColor: "#1e3a8a", arrowColor: "#1e3a8a", todayTextColor: "#1e3a8a" }} />
        </Modal>
      </Portal>
    </View>
  );
};

const PillRow = ({ options, value, onChange }) => (
  <View style={styles.pillRowContainer}>
    {options.map((opt) => {
      const on = value === opt;
      const activeBg =
        opt === "confirmed" ? { backgroundColor: "#16A34A", borderColor: "#16A34A" }
          : opt === "pending_payment" ? { backgroundColor: "#EAB308", borderColor: "#EAB308" }
            : opt === "cancelled" ? { backgroundColor: "#DC2626", borderColor: "#DC2626" }
              : opt === "expired" ? { backgroundColor: "#64748B", borderColor: "#64748B" }
                : opt === "refunded" ? { backgroundColor: "#9333EA", borderColor: "#9333EA" }
                  : opt === "paid" ? { backgroundColor: "#16A34A", borderColor: "#16A34A" }
                    : opt === "unpaid" ? { backgroundColor: "#DC2626", borderColor: "#DC2626" }
                      : opt === "partial_refund" ? { backgroundColor: "#EAB308", borderColor: "#EAB308" }
                        : opt === "pending" ? { backgroundColor: "#EAB308", borderColor: "#EAB308" }
                          : { backgroundColor: "#1E3A8A", borderColor: "#1E3A8A" };
      return (
        <TouchableOpacity key={opt} onPress={() => onChange(opt)}
          style={[styles.pill, on ? activeBg : styles.pillInactive]}>
          <Text style={[styles.pillText, on ? styles.pillTextActive : styles.pillTextInactive]}>{opt.replace(/_/g, " ")}</Text>
        </TouchableOpacity>
      );
    })}
  </View>
);

const DropdownSelect = ({ label, value, options, onSelect, valueKey = "value", displayKey = "label" }) => {
  const [visible, setVisible] = useState(false);
  const selected = options.find(o => o[valueKey] === value);
  return (
    <View style={{ marginBottom: 12 }}>
      <TouchableOpacity onPress={() => setVisible(true)} style={styles.datePickerBtn}>
        <Text style={[styles.datePickerText, selected ? { color: "#0f172a" } : undefined]}>
          {selected ? selected[displayKey] : `Select ${label}`}
        </Text>
        <Ionicons name="chevron-down" size={18} color="#64748b" />
      </TouchableOpacity>
      <Portal>
        <Modal visible={visible} onDismiss={() => setVisible(false)}
          contentContainerStyle={{ backgroundColor: "#fff", margin: 20, borderRadius: 20, padding: 16, maxHeight: 400 }}>
          <ScrollView showsVerticalScrollIndicator={false}>
            <TouchableOpacity onPress={() => { onSelect(""); setVisible(false); }}
              style={{ paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: "#F1F5F9" }}>
              <Text style={{ fontSize: 12, fontWeight: "600", color: "#64748B" }}>None</Text>
            </TouchableOpacity>
            {options.map((opt) => (
              <TouchableOpacity key={opt[valueKey]} onPress={() => { onSelect(opt[valueKey]); setVisible(false); }}
                style={{ paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: "#F1F5F9" }}>
                <Text style={{ fontSize: 12, fontWeight: "700", color: "#0F172A" }}>{opt[displayKey]}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </Modal>
      </Portal>
    </View>
  );
};

const StatusBadge = ({ status, config }) => {
  const cfg = config ? (config[status] ?? Object.values(config)[0]) : null;
  if (!cfg) {
    return <Text style={{ fontSize: 10, fontWeight: "800", color: "#64748B" }}>{status || "\u2014"}</Text>;
  }
  return (
    <View style={[styles.statusBadgeContainer, cfg.badge]}>
      <View style={[styles.statusDot, cfg.dot]} />
      <Text style={[styles.statusLabel, cfg.text]}>{cfg.label}</Text>
    </View>
  );
};

const BookingForm = ({ visible, editingBooking, form, setForm, saving, onSave, onClose, users, schedules }) => {
  const userOptions = users.map(u => ({ label: `${u.full_name || u.name} (${u.email || u.phone || ""})`, value: u.id.toString() }));
  const scheduleOptions = schedules.map(s => ({
    label: `${s.bus_number || ""} \u00B7 ${s.origin || ""} \u2192 ${s.destination || ""} \u00B7 ${formatDateTime(s.departure_time)}`,
    value: s.id.toString(),
  }));
  const clr = (f) => (v) => setForm({ ...form, [f]: v });
  return (
    <Portal>
      <Modal visible={visible} onDismiss={onClose} contentContainerStyle={styles.modalContent}>
        <KeyboardAvoidingView style={styles.flex1} behavior={Platform.OS === "ios" ? "padding" : "height"}>
          <View style={styles.flex1}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalTitle}>{editingBooking ? "Edit Booking" : "New Booking"}</Text>
                <Text style={styles.modalSubtitle}>
                  {editingBooking ? `Updating ${editingBooking.booking_reference}` : "Create a new booking record"}
                </Text>
              </View>
              <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
                <Ionicons name="close" size={17} color="#64748b" />
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.flex1} contentContainerStyle={{ paddingBottom: 30, paddingHorizontal: 20 }}
              showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
              <SectionLabel>Passenger Information</SectionLabel>
              <Field label="Passenger Name" value={form.passenger_name} onChangeText={clr("passenger_name")} />
              <Field label="Passenger Phone" value={form.passenger_phone} onChangeText={clr("passenger_phone")} keyboardType="phone-pad" />
              <DropdownSelect label="Registered User" value={form.user_id} options={userOptions} onSelect={(v) => setForm({ ...form, user_id: v })} />
              <SectionLabel>Schedule</SectionLabel>
              <DropdownSelect label="Schedule" value={form.schedule_id} options={scheduleOptions} onSelect={(v) => setForm({ ...form, schedule_id: v })} />
              <SectionLabel>Seats</SectionLabel>
              <View style={styles.formRow}>
                <View style={styles.formRowItem}><Field label="Number of Seats" value={form.seats} onChangeText={clr("seats")} keyboardType="numeric" /></View>
                <View style={styles.formRowItem}><Field label="Seat Numbers (e.g. 1,2,3)" value={form.seat_numbers} onChangeText={clr("seat_numbers")} /></View>
              </View>
              <SectionLabel>Boarding & Dropping</SectionLabel>
              <View style={styles.formRow}>
                <View style={styles.formRowItem}><Field label="Boarding Point" value={form.boarding_point} onChangeText={clr("boarding_point")} /></View>
                <View style={styles.formRowItem}><Field label="Dropping Point" value={form.dropping_point} onChangeText={clr("dropping_point")} /></View>
              </View>
              <SectionLabel>Fare Details</SectionLabel>
              <View style={styles.formRow}>
                <View style={styles.formRowItem}><Field label="Fare Amount" value={form.fare} onChangeText={clr("fare")} keyboardType="numeric" /></View>
                <View style={styles.formRowItem}><Field label="Discount" value={form.discount} onChangeText={clr("discount")} keyboardType="numeric" /></View>
              </View>
              <Field label="Total Amount" value={form.total_amount} onChangeText={clr("total_amount")} keyboardType="numeric" />
              <SectionLabel>Payment</SectionLabel>
              <DropdownSelect label="Payment Method" value={form.payment_method}
                options={PAYMENT_METHODS.map(m => ({ label: m.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase()), value: m }))}
                onSelect={(v) => setForm({ ...form, payment_method: v })} />
              <SectionLabel>Payment Status</SectionLabel>
              <PillRow options={PAYMENT_STATUSES} value={form.payment_status} onChange={(v) => setForm({ ...form, payment_status: v })} />
              <SectionLabel>Booking Status</SectionLabel>
              <PillRow options={BOOKING_STATUSES} value={form.status} onChange={(v) => setForm({ ...form, status: v })} />
              <SectionLabel>Notes</SectionLabel>
              <Field label="Special notes\u2026" value={form.notes} onChangeText={clr("notes")} multiline numberOfLines={3} />
              <View style={styles.formActions}>
                <TouchableOpacity onPress={onClose} style={styles.cancelBtn}><Text style={styles.cancelBtnText}>Cancel</Text></TouchableOpacity>
                <TouchableOpacity onPress={onSave} disabled={saving} style={styles.saveBtn}>
                  {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.saveBtnText}>{editingBooking ? "UPDATE BOOKING" : "CREATE BOOKING"}</Text>}
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </Portal>
  );
};

const ViewBookingModal = ({ visible, booking, onClose }) => {
  if (!booking) return null;
  return (
    <Portal>
      <Modal visible={visible} onDismiss={onClose} contentContainerStyle={styles.modalContent}>
        <View style={styles.flex1}>
          <View style={styles.modalHeader}>
            <View>
              <Text style={styles.modalTitle}>Booking Details</Text>
              <Text style={styles.modalSubtitle}>{booking.booking_reference}</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Ionicons name="close" size={17} color="#64748b" />
            </TouchableOpacity>
          </View>
          <ScrollView style={styles.flex1} contentContainerStyle={{ paddingBottom: 30, paddingHorizontal: 20 }} showsVerticalScrollIndicator={false}>
            <View style={{ flexDirection: "row", gap: 8, marginTop: 16, marginBottom: 12 }}>
              <StatusBadge status={booking.status} config={STATUS_CFG} />
              <StatusBadge status={booking.payment_status || "pending"} config={PAYMENT_CFG} />
            </View>
            <SectionLabel>Booking Reference</SectionLabel>
            <View style={styles.viewField}><Text style={styles.viewFieldValue}>{booking.booking_reference}</Text></View>
            <SectionLabel>Passenger</SectionLabel>
            <View style={styles.viewField}><Text style={styles.viewFieldLabel}>Name</Text><Text style={styles.viewFieldValue}>{booking.user_name || booking.passenger_name || "\u2014"}</Text></View>
            <View style={styles.viewField}><Text style={styles.viewFieldLabel}>Phone</Text><Text style={styles.viewFieldValue}>{booking.passenger_phone || booking.user_phone || "\u2014"}</Text></View>
            <View style={styles.viewField}><Text style={styles.viewFieldLabel}>Email</Text><Text style={styles.viewFieldValue}>{booking.user_email || "\u2014"}</Text></View>
            <SectionLabel>Route</SectionLabel>
            <View style={styles.viewField}><Text style={styles.viewFieldValue}>{getRouteLabel(booking)}</Text></View>
            <SectionLabel>Schedule</SectionLabel>
            <View style={styles.viewField}><Text style={styles.viewFieldLabel}>Departure</Text><Text style={styles.viewFieldValue}>{formatDateTime(booking.departure_time)}</Text></View>
            <View style={styles.viewField}><Text style={styles.viewFieldLabel}>Arrival</Text><Text style={styles.viewFieldValue}>{formatDateTime(booking.arrival_time) || "\u2014"}</Text></View>
            <SectionLabel>Bus</SectionLabel>
            <View style={styles.viewField}><Text style={styles.viewFieldValue}>{booking.bus_number} ({booking.bus_type || ""})</Text></View>
            <SectionLabel>Seats</SectionLabel>
            <View style={styles.viewField}>
              <Text style={styles.viewFieldValue}>
                {Array.isArray(booking.seat_numbers) ? booking.seat_numbers.join(", ") : (booking.seat_numbers || `${booking.seats} seat(s)`)}
              </Text>
            </View>
            <View style={styles.formRow}>
              <View style={styles.formRowItem}>
                <SectionLabel>Boarding Point</SectionLabel>
                <View style={styles.viewField}><Text style={styles.viewFieldValue}>{booking.boarding_point || "\u2014"}</Text></View>
              </View>
              <View style={styles.formRowItem}>
                <SectionLabel>Dropping Point</SectionLabel>
                <View style={styles.viewField}><Text style={styles.viewFieldValue}>{booking.dropping_point || "\u2014"}</Text></View>
              </View>
            </View>
            <SectionLabel>Payment</SectionLabel>
            <View style={styles.formRow}>
              <View style={styles.formRowItem}>
                <View style={styles.viewField}><Text style={styles.viewFieldLabel}>Fare</Text><Text style={styles.viewFieldValue}>Rs. {Number(booking.fare || 0).toLocaleString()}</Text></View>
              </View>
              <View style={styles.formRowItem}>
                <View style={styles.viewField}><Text style={styles.viewFieldLabel}>Discount</Text><Text style={styles.viewFieldValue}>Rs. {Number(booking.discount || 0).toLocaleString()}</Text></View>
              </View>
            </View>
            <View style={styles.viewField}><Text style={styles.viewFieldLabel}>Total Amount</Text><Text style={[styles.viewFieldValue, { fontSize: 16, fontWeight: "900", color: "#1E3A8A" }]}>{getAmount(booking)}</Text></View>
            <View style={styles.viewField}><Text style={styles.viewFieldLabel}>Method</Text><Text style={styles.viewFieldValue}>{booking.payment_method ? booking.payment_method.replace(/_/g, " ") : "\u2014"}</Text></View>
            <SectionLabel>Dates</SectionLabel>
            <View style={styles.viewField}><Text style={styles.viewFieldLabel}>Booked At</Text><Text style={styles.viewFieldValue}>{formatDateTime(booking.created_at)}</Text></View>
            <View style={styles.viewField}><Text style={styles.viewFieldLabel}>Confirmed At</Text><Text style={styles.viewFieldValue}>{formatDateTime(booking.confirmed_at) || "\u2014"}</Text></View>
            <View style={styles.viewField}><Text style={styles.viewFieldLabel}>Cancelled At</Text><Text style={styles.viewFieldValue}>{formatDateTime(booking.cancelled_at) || "\u2014"}</Text></View>
            <SectionLabel>Notes</SectionLabel>
            <View style={styles.viewField}><Text style={styles.viewFieldValue}>{booking.notes || "\u2014"}</Text></View>
            <View style={styles.formActions}>
              <TouchableOpacity onPress={onClose} style={styles.cancelBtn}><Text style={styles.cancelBtnText}>Close</Text></TouchableOpacity>
            </View>
          </ScrollView>
        </View>
      </Modal>
    </Portal>
  );
};

const PdfPreviewModal = ({ visible, uri, onClose, title }) => (
  <Portal>
    <Modal visible={visible} onDismiss={onClose} contentContainerStyle={styles.pdfModalContent}>
      <View style={styles.pdfModalHeader}>
        <Text style={styles.pdfModalTitle}>{title || "PDF Preview"}</Text>
        <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
          <Ionicons name="close" size={17} color="#64748b" />
        </TouchableOpacity>
      </View>
      <View style={styles.pdfContainer}>
        {Platform.OS === "web" ? (
          <iframe src={uri} style={{ flex: 1, border: "none", width: "100%", height: "100%" }} title="PDF Preview" />
        ) : (
          <PdfViewer source={{ uri }} style={{ flex: 1 }} />
        )}
      </View>
    </Modal>
  </Portal>
);

const FilterBar = ({ filters, setFilters, buses, routes }) => {
  const statusOpts = ["", ...BOOKING_STATUSES].map(s => ({ label: s ? s.replace(/_/g, " ") : "All Statuses", value: s }));
  const payOpts = ["", ...PAYMENT_STATUSES].map(s => ({ label: s ? s.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase()) : "All Payments", value: s }));
  const busOpts = [""].concat(buses.filter(Boolean).map(b => b.bus_number)).filter((v, i, a) => a.indexOf(v) === i)
    .map(b => ({ label: b || "All Buses", value: b }));
  const routeOpts = [""].concat(routes.filter(Boolean).map(r => `${r.origin} \u2192 ${r.destination}`)).filter((v, i, a) => a.indexOf(v) === i)
    .map(r => ({ label: r || "All Routes", value: r }));
  const clearFilters = () => {
    setFilters({
      booking_status: "", payment_status: "", travel_date: "",
      date_from: "", date_to: "", route: "", bus: "",
    });
  };
  const hasFilters = Object.values(filters).some(v => v !== "");
  return (
    <View style={styles.filterBar}>
      <View style={styles.filterRow}>
        <View style={styles.filterItem}>
          <Text style={styles.filterLabel}>Booking Status</Text>
          <DropdownSelect label="Booking Status" value={filters.booking_status} options={statusOpts}
            onSelect={(v) => setFilters({ ...filters, booking_status: v })} />
        </View>
        <View style={styles.filterItem}>
          <Text style={styles.filterLabel}>Payment Status</Text>
          <DropdownSelect label="Payment Status" value={filters.payment_status} options={payOpts}
            onSelect={(v) => setFilters({ ...filters, payment_status: v })} />
        </View>
        <View style={styles.filterItem}>
          <Text style={styles.filterLabel}>Travel Date</Text>
          <DatePicker label="Travel Date" value={filters.travel_date}
            onChange={(d) => setFilters({ ...filters, travel_date: d })} />
        </View>
        <View style={styles.filterItem}>
          <Text style={styles.filterLabel}>Bus</Text>
          <DropdownSelect label="Bus" value={filters.bus} options={busOpts}
            onSelect={(v) => setFilters({ ...filters, bus: v })} />
        </View>
        <View style={styles.filterItem}>
          <Text style={styles.filterLabel}>Route</Text>
          <DropdownSelect label="Route" value={filters.route} options={routeOpts}
            onSelect={(v) => setFilters({ ...filters, route: v })} />
        </View>
      </View>
      <View style={styles.filterRow}>
        <View style={styles.filterItem}>
          <Text style={styles.filterLabel}>Date From</Text>
          <DatePicker label="Date From" value={filters.date_from}
            onChange={(d) => setFilters({ ...filters, date_from: d })} />
        </View>
        <View style={styles.filterItem}>
          <Text style={styles.filterLabel}>Date To</Text>
          <DatePicker label="Date To" value={filters.date_to} minDate={filters.date_from || undefined}
            onChange={(d) => setFilters({ ...filters, date_to: d })} />
        </View>
        {hasFilters && (
          <TouchableOpacity onPress={clearFilters} style={styles.clearFilterBtn}>
            <Ionicons name="close-circle-outline" size={16} color="#ef4444" />
            <Text style={styles.clearFilterText}>Clear</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
};

export default function AdminBookings() {
  const {
    users, schedules, buses, routes,
    loading: loadingStates, refreshing: refreshingStates,
    getPagination, updatePagination,
    getSearchQuery, updateSearchQuery,
    getSort, updateSort,
  } = useAdminData();

  const { page, limit, total: totalItems } = getPagination("bookings");
  const searchQuery = getSearchQuery("bookings");
  const { sortBy, sortOrder } = getSort("bookings");

  const [localBookings, setLocalBookings] = useState([]);
  const [localTotal, setLocalTotal] = useState(0);
  const [localLoading, setLocalLoading] = useState(false);
  const [localRefreshing, setLocalRefreshing] = useState(false);
  const [fetchError, setFetchError] = useState(null);

  const [searchInput, setSearchInput] = useState(searchQuery);
  const [modalVisible, setModalVisible] = useState(false);
  const [exportModalVisible, setExportModalVisible] = useState(false);
  const [viewModalVisible, setViewModalVisible] = useState(false);
  const [pdfModalVisible, setPdfModalVisible] = useState(false);
  const [pdfUri, setPdfUri] = useState(null);
  const [pdfTitle, setPdfTitle] = useState("");
  const [editingBooking, setEditingBooking] = useState(null);
  const [viewingBooking, setViewingBooking] = useState(null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [exportRange, setExportRange] = useState("page");
  const [pageSizeModalVisible, setPageSizeModalVisible] = useState(false);
  const [deleteConfirmVisible, setDeleteConfirmVisible] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [form, setForm] = useState({ ...EMPTY_FORM });
  const [filters, setFilters] = useState({
    booking_status: "", payment_status: "", travel_date: "",
    date_from: "", date_to: "", route: "", bus: "",
  });
  const [showFilters, setShowFilters] = useState(false);
  const debounceRef = useRef(null);

  const fetchData = useCallback(async (isRefresh = false) => {
    const key = "bookings";
    isRefresh ? setLocalRefreshing(true) : setLocalLoading(true);
    setFetchError(null);
    try {
      const params = {
        page, limit,
        search: searchQuery,
        sortBy, sortOrder,
      };
      if (filters.booking_status) params.booking_status = filters.booking_status;
      if (filters.payment_status) params.payment_status = filters.payment_status;
      if (filters.travel_date) params.travel_date = filters.travel_date;
      if (filters.date_from) params.date_from = filters.date_from;
      if (filters.date_to) params.date_to = filters.date_to;
      if (filters.route) params.route = filters.route;
      if (filters.bus) params.bus = filters.bus;
      const res = await getAllBookings(params);
      const data = res.data.data;
      setLocalBookings(data.bookings || []);
      const total = data.pagination?.total || 0;
      setLocalTotal(total);
      updatePagination(key, { total, page: data.pagination?.page || page });
    } catch (err) {
      console.error("Failed to fetch bookings", err);
      setFetchError(err.message || "Failed to load bookings");
    } finally {
      setLocalLoading(false);
      setLocalRefreshing(false);
    }
  }, [page, limit, searchQuery, sortBy, sortOrder, filters, updatePagination]);

  useEffect(() => { fetchData(); }, [page,limit,searchQuery,sortBy,sortOrder,filters,updatePagination]);

  const commitSearch = useCallback((text) => updateSearchQuery("bookings", text), [updateSearchQuery]);

  const handleSearch = (text) => {
    setSearchInput(text);
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => commitSearch(text), 500);
  };

  const handleSort = (column) => {
    if (!column.sortable) return;
    if (sortBy === column.key) {
      updateSort("bookings", column.key, sortOrder === "ASC" ? "DESC" : "ASC");
    } else {
      updateSort("bookings", column.key, "ASC");
    }
  };

  const handlePageSizeChange = (newSize) => {
    updatePagination("bookings", { limit: newSize, page: 1 });
    setPageSizeModalVisible(false);
  };

  const openCreate = () => { setEditingBooking(null); setForm({ ...EMPTY_FORM }); setModalVisible(true); };
  const openEdit = (item) => { setEditingBooking(item); setForm(itemToForm(item)); setModalVisible(true); };
  const openView = (item) => { setViewingBooking(item); setViewModalVisible(true); };

  const handleSave = async () => {
    if (!form.schedule_id) {
      return Alert.alert("Required", "Schedule is required.");
    }
    setSaving(true);
    try {
      if (editingBooking) {
        await updateBooking(editingBooking.id, toPayload(form));
        Alert.alert("Success", "Booking updated successfully!", [
          { text: "OK", onPress: () => fetchData(true) },
        ]);
      } else {
        await createBooking(toPayload(form));
        Alert.alert("Success", "Booking created successfully!", [
          { text: "OK", onPress: () => fetchData(true) },
        ]);
      }
      setModalVisible(false);
    } catch (err) {
      const msg = err?.response?.data?.message || err.message || "Could not save booking.";
      Alert.alert("Error", msg);
    } finally {
      setSaving(false);
      await fetchData(true);
    }
  };

  const handleDelete = (id, ref) => {
    if (!id) { Alert.alert("Error", "Invalid booking ID."); return; }
    setDeleteTarget({ id, ref });
    setDeleteConfirmVisible(true);
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    const { id } = deleteTarget;
    setDeleting(true);
    setDeleteConfirmVisible(false);
    try {
      await deleteBooking(id);
      Alert.alert("Success", "Booking deleted successfully.", [
        { text: "OK", onPress: () => fetchData(true) },
      ]);
    } catch (err) {
      const msg = err?.response?.data?.message || err.message || "Could not delete booking.";
      Alert.alert("Delete Failed", msg);
    } finally {
      setDeleting(false);
      setDeleteTarget(null);
      await fetchData(true);
    }
  };

  const handleCancelBooking = async (item) => {
    Alert.alert(
      "Cancel Booking",
      `Cancel booking "${item.booking_reference}"?`,
      [
        { text: "No", style: "cancel" },
        {
          text: "Yes, Cancel",
          style: "destructive",
          onPress: async () => {
            try {
              await cancelBooking(item.booking_reference, "Cancelled by admin");
              Alert.alert("Success", "Booking cancelled.", [
                { text: "OK", onPress: () => fetchData(true) },
              ]);
            } catch (err) {
              Alert.alert("Error", err?.response?.data?.message || "Could not cancel booking.");
            }
          },
        },
      ]
    );
  };

  const handlePrintTicket = async (ref) => {
    try {
      const res = await downloadTicket(ref);
      const blob = res.data;
      if (Platform.OS === "web") {
        const url = URL.createObjectURL(blob);
        setPdfUri(url);
        setPdfTitle(`Ticket - ${ref}`);
        setPdfModalVisible(true);
      } else {
        const path = `${FileSystem.cacheDirectory}ticket_${ref}.pdf`;
        const reader = new FileReader();
        reader.onload = async () => {
          const base64 = reader.result.split(",")[1];
          await FileSystem.writeAsStringAsync(path, base64, { encoding: FileSystem.EncodingType.Base64 });
          await shareFile(path, "application/pdf", `Ticket ${ref}`);
        };
        reader.readAsDataURL(blob);
      }
    } catch (err) {
      Alert.alert("Print Failed", "Could not generate ticket PDF.");
    }
  };

  const handleExport = async (type) => {
    setExportModalVisible(false);
    setExporting(true);
    try {
      const exportData = exportRange === "all" ? (await getAllBookings({ limit: 10000 })).data.data?.bookings || localBookings : localBookings;
      if (type === "csv") await exportCSV(exportData);
      if (type === "pdf") await exportPDF(exportData);
      if (type === "xls") await exportXLS(exportData);
    } catch (e) {
      Alert.alert("Export Failed", e.message || "Something went wrong.");
    } finally {
      setExporting(false);
    }
  };

  const totalPages = Math.ceil(localTotal / limit) || 1;
  const startEntry = localTotal === 0 ? 0 : (page - 1) * limit + 1;
  const endEntry = Math.min(page * limit, localTotal);

  const getPageNumbers = () => {
    const pages = [];
    const maxVisible = 5;
    let start = Math.max(1, page - Math.floor(maxVisible / 2));
    let end = Math.min(totalPages, start + maxVisible - 1);
    if (end - start + 1 < maxVisible) start = Math.max(1, end - maxVisible + 1);
    for (let i = start; i <= end; i++) pages.push(i);
    return pages;
  };

  const SortIndicator = ({ column }) => {
    if (sortBy !== column.key) return <Ionicons name="swap-vertical-outline" size={12} color="#94a3b8" style={{ marginLeft: 3 }} />;
    return (
      <Ionicons
        name={sortOrder === "ASC" ? "caret-up" : "caret-down"}
        size={12} color="#fff" style={{ marginLeft: 3 }}
      />
    );
  };

  const renderTableHeader = () => (
    <View style={styles.tableHeaderRow}>
      {COLUMNS.map((col) => (
        <TouchableOpacity
          key={col.key}
          disabled={!col.sortable}
          onPress={() => handleSort(col)}
          style={[styles.tableHeaderCell, { flex: col.flex }]}
        >
          <View style={styles.tableHeaderContent}>
            <Text style={styles.tableHeaderText}>{col.label}</Text>
            {col.sortable && <SortIndicator column={col} />}
          </View>
        </TouchableOpacity>
      ))}
    </View>
  );

  const renderTableRow = (item, index) => (
    <Animated.View key={item.id ?? item._id} entering={FadeInDown.delay(index * 20).springify()}>
      <View style={[styles.tableRow, index % 2 === 1 && styles.tableRowAlt]}>
        <View style={[styles.tableCell, { flex: COLUMNS[0].flex }]}>
          <Text style={styles.cellRef} numberOfLines={1}>{item.booking_reference}</Text>
        </View>
        <View style={[styles.tableCell, { flex: COLUMNS[1].flex }]}>
          <Text style={styles.cellText} numberOfLines={1}>{item.user_name || item.passenger_name || "\u2014"}</Text>
        </View>
        <View style={[styles.tableCell, { flex: COLUMNS[2].flex }]}>
          <Text style={styles.cellText} numberOfLines={1}>{getRouteLabel(item)}</Text>
        </View>
        <View style={[styles.tableCell, { flex: COLUMNS[3].flex }]}>
          <Text style={styles.cellDate}>{formatDateTime(item.departure_time)}</Text>
        </View>
        <View style={[styles.tableCell, { flex: COLUMNS[4].flex }]}>
          <Text style={styles.cellText} numberOfLines={1}>{item.bus_number || "\u2014"}</Text>
        </View>
        <View style={[styles.tableCell, { flex: COLUMNS[5].flex }]}>
          <Text style={styles.cellText}>{item.seats || "\u2014"}</Text>
        </View>
        <View style={[styles.tableCell, { flex: COLUMNS[6].flex }]}>
          <Text style={styles.cellFare}>{getAmount(item)}</Text>
        </View>
        <View style={[styles.tableCell, { flex: COLUMNS[7].flex }]}>
          <StatusBadge status={item.payment_status || "pending"} config={PAYMENT_CFG} />
        </View>
        <View style={[styles.tableCell, { flex: COLUMNS[8].flex }]}>
          <StatusBadge status={item.status} config={STATUS_CFG} />
        </View>
        <View style={[styles.tableCell, { flex: COLUMNS[9].flex }]}>
          <Text style={styles.cellDate}>{formatDate(item.created_at)}</Text>
        </View>
        <View style={[styles.tableCell, { flex: COLUMNS[10].flex, flexDirection: "row", gap: 4 }]}>
          <TouchableOpacity onPress={() => openView(item)} style={styles.actionBtn}>
            <Ionicons name="eye-outline" size={13} color="#1e3a8a" />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => openEdit(item)} style={styles.actionBtn}>
            <Ionicons name="pencil-outline" size={13} color="#475569" />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => handleDelete(item.id || item._id, item.booking_reference)}
            style={[styles.actionBtn, { backgroundColor: "#FEF2F2" }]}
          >
            <Ionicons name="trash-outline" size={13} color="#ef4444" />
          </TouchableOpacity>
          {item.status !== "cancelled" && item.status !== "refunded" && (
            <TouchableOpacity onPress={() => handlePrintTicket(item.booking_reference)} style={styles.actionBtn}>
              <Ionicons name="print-outline" size={13} color="#2563eb" />
            </TouchableOpacity>
          )}
          {(item.status === "confirmed" || item.status === "pending_payment") && (
            <TouchableOpacity onPress={() => handleCancelBooking(item)} style={[styles.actionBtn, { backgroundColor: "#FEF2F2" }]}>
              <Ionicons name="close-outline" size={13} color="#dc2626" />
            </TouchableOpacity>
          )}
        </View>
      </View>
    </Animated.View>
  );

  const loading = localLoading || loadingStates.bookings;
  const refreshing = localRefreshing || refreshingStates.bookings;

  return (
    <SafeAreaView style={styles.screen}>
      <StatusBar barStyle="light-content" backgroundColor="#1e3a8a" />

      <View style={styles.header}>
        <View style={styles.headerRow}>
          <View>
            <Text style={styles.headerTitle}>Booking Manager</Text>
            <Text style={styles.headerCount}>{localTotal} booking{localTotal !== 1 ? "s" : ""} found</Text>
          </View>
          <View style={styles.headerActions}>
            <TouchableOpacity onPress={() => setShowFilters((s) => !s)} style={styles.exportBtn}>
              <Ionicons name="funnel-outline" size={18} color={showFilters ? "#fff" : "rgba(255,255,255,0.6)"} />
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setExportModalVisible(true)}
              disabled={exporting || localBookings.length === 0} style={styles.exportBtn}>
              {exporting ? <ActivityIndicator size="small" color="#fff" /> : <Ionicons name="share-outline" size={20} color="#fff" />}
            </TouchableOpacity>
            <TouchableOpacity onPress={openCreate} style={styles.addBtn}>
              <Ionicons name="add-circle" size={17} color="#1e3a8a" />
              <Text style={styles.addBtnText}>ADD BOOKING</Text>
            </TouchableOpacity>
          </View>
        </View>
        <Searchbar
          placeholder="Search reference, passenger, route, bus..."
          onChangeText={handleSearch}
          value={searchInput}
          elevation={0}
          style={styles.searchbar}
          inputStyle={styles.searchbarInput}
          placeholderTextColor="rgba(255,255,255,0.4)"
          iconColor="rgba(255,255,255,0.6)"
        />
      </View>

      {showFilters && (
        <FilterBar filters={filters} setFilters={setFilters} buses={buses} routes={routes} />
      )}

      {loading && !refreshing ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator color="#1e3a8a" size="large" />
          <Text style={styles.loadingText}>Loading bookings...</Text>
        </View>
      ) : (
        <ScrollView
          style={styles.flex1}
          contentContainerStyle={styles.flexGrow}
          showsVerticalScrollIndicator={false}
          nestedScrollEnabled={true}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => fetchData(true)}
              tintColor="#1e3a8a"
              colors={["#1e3a8a"]}
            />
          }
        >
          <View style={styles.statsBar}>
            {[
              { label: "Total", val: localTotal, color: "#1E3A8A" },
              { label: "Confirmed", val: localBookings.filter(b => b.status === "confirmed").length, color: "#16A34A" },
              { label: "Pending", val: localBookings.filter(b => b.status === "pending_payment").length, color: "#CA8A04" },
              { label: "Cancelled", val: localBookings.filter(b => b.status === "cancelled").length, color: "#DC2626" },
            ].map(({ label, val, color }, i, arr) => (
              <View key={label} style={[styles.statBox, i < arr.length - 1 && styles.statBoxBorder]}>
                <Text style={[styles.statValue, { color }]}>{val}</Text>
                <Text style={styles.statLabel}>{label}</Text>
              </View>
            ))}
          </View>

          {fetchError && (
            <View style={styles.errorBanner}>
              <Ionicons name="alert-circle-outline" size={16} color="#DC2626" />
              <Text style={styles.errorBannerText}>{fetchError}</Text>
              <TouchableOpacity onPress={() => fetchData(true)}>
                <Ionicons name="refresh-outline" size={18} color="#DC2626" />
              </TouchableOpacity>
            </View>
          )}

          <ScrollView horizontal showsHorizontalScrollIndicator={true} style={styles.tableScroll} nestedScrollEnabled={true}>
            <View style={styles.tableContainer}>
              {renderTableHeader()}
              {localBookings.length > 0 ? (
                localBookings.map((item, index) => renderTableRow(item, index))
              ) : (
                <View style={styles.emptyTable}>
                  <MaterialCommunityIcons name="ticket-outline" size={48} color="#e2e8f0" />
                  <Text style={styles.emptyText}>
                    {searchQuery ? `No results for "${searchQuery}"` : "No Bookings Found"}
                  </Text>
                  {!searchQuery && (
                    <TouchableOpacity onPress={openCreate} style={styles.emptyAddBtn}>
                      <Ionicons name="add" size={16} color="#fff" />
                      <Text style={styles.emptyAddBtnText}>Add First Booking</Text>
                    </TouchableOpacity>
                  )}
                </View>
              )}
            </View>
          </ScrollView>

          {localBookings.length > 0 && (
            <View style={styles.footerContainer}>
              <View style={styles.footerRow}>
                <TouchableOpacity onPress={() => setPageSizeModalVisible(true)} style={styles.pageSizeBtn}>
                  <Text style={styles.pageSizeText}>{limit} rows</Text>
                  <Ionicons name="chevron-down" size={12} color="#64748b" />
                </TouchableOpacity>
                <Text style={styles.entriesInfo}>Showing {startEntry} to {endEntry} of {localTotal} entries</Text>
                <View style={styles.pagination}>
                  <TouchableOpacity disabled={page <= 1}
                    onPress={() => updatePagination("bookings", { page: page - 1 })}
                    style={[styles.paginationBtn, page <= 1 ? styles.paginationBtnDisabled : styles.paginationBtnActive]}>
                    <Text style={[styles.paginationBtnText, page <= 1 ? styles.paginationTextDisabled : styles.paginationTextActive]}>Prev</Text>
                  </TouchableOpacity>
                  {getPageNumbers().map((p) => (
                    <TouchableOpacity key={p} onPress={() => updatePagination("bookings", { page: p })}
                      style={[styles.pageNumBtn, p === page && styles.pageNumBtnActive]}>
                      <Text style={[styles.pageNumText, p === page && styles.pageNumTextActive]}>{p}</Text>
                    </TouchableOpacity>
                  ))}
                  <TouchableOpacity disabled={page >= totalPages}
                    onPress={() => updatePagination("bookings", { page: page + 1 })}
                    style={[styles.paginationBtn, page >= totalPages ? styles.paginationBtnDisabled : styles.paginationBtnActive]}>
                    <Text style={[styles.paginationBtnText, page >= totalPages ? styles.paginationTextDisabled : styles.paginationTextActive]}>Next</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          )}
        </ScrollView>
      )}

      <BookingForm
        visible={modalVisible} editingBooking={editingBooking} form={form}
        setForm={setForm} saving={saving} onSave={handleSave}
        onClose={() => setModalVisible(false)} users={users} schedules={schedules}
      />

      <ViewBookingModal visible={viewModalVisible} booking={viewingBooking} onClose={() => setViewModalVisible(false)} />

      <PdfPreviewModal visible={pdfModalVisible} uri={pdfUri} onClose={() => setPdfModalVisible(false)} title={pdfTitle} />

      <Portal>
        <Modal visible={exportModalVisible} onDismiss={() => setExportModalVisible(false)} contentContainerStyle={styles.exportModal}>
          <Text style={styles.exportModalTitle}>Export Booking Data</Text>
          <View style={styles.exportRangeRow}>
            <Text style={styles.exportRangeLabel}>Range:</Text>
            <TouchableOpacity onPress={() => setExportRange("page")}
              style={[styles.exportRangeBtn, exportRange === "page" && styles.exportRangeBtnActive]}>
              <Text style={[styles.exportRangeBtnText, exportRange === "page" && styles.exportRangeBtnTextActive]}>Current Page</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setExportRange("all")}
              style={[styles.exportRangeBtn, exportRange === "all" && styles.exportRangeBtnActive]}>
              <Text style={[styles.exportRangeBtnText, exportRange === "all" && styles.exportRangeBtnTextActive]}>All Data</Text>
            </TouchableOpacity>
          </View>
          {[
            { key: "csv", icon: "grid-outline", label: "Export CSV" },
            { key: "xls", icon: "tablet-landscape-outline", label: "Export Excel" },
            { key: "pdf", icon: "document-text-outline", label: "Export PDF" },
          ].map(({ key, icon, label }) => (
            <TouchableOpacity key={key} onPress={() => handleExport(key)} style={styles.exportOption}>
              <Ionicons name={icon} size={18} color="#1e3a8a" />
              <Text style={styles.exportOptionText}>{label}</Text>
            </TouchableOpacity>
          ))}
          <TouchableOpacity onPress={() => setExportModalVisible(false)} style={styles.exportCancel}>
            <Text style={styles.exportCancelText}>Cancel</Text>
          </TouchableOpacity>
        </Modal>
      </Portal>

      <Portal>
        <Modal visible={pageSizeModalVisible} onDismiss={() => setPageSizeModalVisible(false)} contentContainerStyle={styles.pageSizeModal}>
          <Text style={styles.exportModalTitle}>Rows Per Page</Text>
          {PAGE_SIZES.map((size) => (
            <TouchableOpacity key={size} onPress={() => handlePageSizeChange(size)}
              style={[styles.pageSizeOption, limit === size && styles.pageSizeOptionActive]}>
              <Text style={[styles.pageSizeOptionText, limit === size && styles.pageSizeOptionTextActive]}>{size}</Text>
            </TouchableOpacity>
          ))}
          <TouchableOpacity onPress={() => setPageSizeModalVisible(false)} style={styles.exportCancel}>
            <Text style={styles.exportCancelText}>Cancel</Text>
          </TouchableOpacity>
        </Modal>
      </Portal>

      <Portal>
        <Dialog visible={deleteConfirmVisible} onDismiss={() => { setDeleteConfirmVisible(false); setDeleteTarget(null); }}>
          <Dialog.Title>Remove Booking</Dialog.Title>
          <Dialog.Content>
            <Text>Delete booking "{deleteTarget?.ref}"? This action cannot be undone.</Text>
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => { setDeleteConfirmVisible(false); setDeleteTarget(null); }}>Cancel</Button>
            <Button onPress={confirmDelete} color="#ef4444">Delete</Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex1: { flex: 1 },
  flexGrow: { flexGrow: 1 },
  screen: { flex: 1, backgroundColor: "#F8FAFC" },
  fieldError: { fontSize: 10, color: "#EF4444", fontWeight: "600", marginTop: 4, marginLeft: 4 },
  sectionLabel: {
    color: "#1E3A8A", fontSize: 10, fontWeight: "900", textTransform: "uppercase",
    letterSpacing: 2, marginTop: 20, marginBottom: 8,
  },
  pillRowContainer: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 8 },
  pill: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 9999, borderWidth: 1 },
  pillInactive: { backgroundColor: "#F1F5F9", borderColor: "#E2E8F0" },
  pillText: { fontSize: 10, fontWeight: "800" },
  pillTextActive: { color: "#FFFFFF" },
  pillTextInactive: { color: "#64748B" },
  statusBadgeContainer: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12, alignSelf: "flex-start" },
  statusDot: { width: 6, height: 6, borderRadius: 3 },
  statusLabel: { fontSize: 9, fontWeight: "900" },
  modalContent: { backgroundColor: "#fff", margin: 14, borderRadius: 24, maxHeight: "92%" },
  modalHeader: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingHorizontal: 20, paddingTop: 20, paddingBottom: 16, borderBottomWidth: 1, borderBottomColor: "#F1F5F9",
  },
  modalTitle: { fontSize: 16, fontWeight: "900", color: "#0F172A" },
  modalSubtitle: { fontSize: 10, color: "#94A3B8", marginTop: 2 },
  closeBtn: { width: 36, height: 36, backgroundColor: "#F1F5F9", borderRadius: 14, alignItems: "center", justifyContent: "center" },
  formRow: { flexDirection: "row", gap: 8 },
  formRowItem: { flex: 1 },
  formActions: { flexDirection: "row", gap: 12, marginTop: 16, marginBottom: 40 },
  cancelBtn: { flex: 1, paddingVertical: 16, borderRadius: 16, alignItems: "center", backgroundColor: "#F1F5F9", borderWidth: 1, borderColor: "#E2E8F0" },
  cancelBtnText: { fontWeight: "800", color: "#64748B", fontSize: 12 },
  saveBtn: {
    flex: 2, paddingVertical: 16, borderRadius: 16, alignItems: "center", backgroundColor: "#1E3A8A",
    shadowColor: "#1e3a8a", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 5,
  },
  saveBtnText: { fontWeight: "900", color: "#FFFFFF", fontSize: 12 },
  datePickerBtn: {
    backgroundColor: "#FFFFFF", borderWidth: 1, borderColor: "#E2E8F0", borderRadius: 14,
    paddingHorizontal: 16, paddingVertical: 12, marginBottom: 12, flexDirection: "row",
    alignItems: "center", justifyContent: "space-between",
  },
  datePickerText: { fontSize: 12, fontWeight: "700", color: "#64748B" },
  viewField: { marginBottom: 12 },
  viewFieldLabel: { fontSize: 10, fontWeight: "700", color: "#64748B", marginBottom: 4 },
  viewFieldValue: { fontSize: 12, fontWeight: "600", color: "#0F172A" },
  header: { backgroundColor: "#1E3A8A", paddingHorizontal: 16, paddingTop: 16, paddingBottom: 16 },
  headerRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 12 },
  headerTitle: { fontSize: 18, fontWeight: "900", color: "#FFFFFF", letterSpacing: -0.5 },
  headerCount: { fontSize: 10, color: "#93C5FD", fontWeight: "600", marginTop: 2 },
  headerActions: { flexDirection: "row", alignItems: "center", gap: 8 },
  exportBtn: {
    width: 44, height: 44, borderRadius: 14, alignItems: "center", justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.15)",
  },
  addBtn: {
    flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: "#FFFFFF",
    paddingHorizontal: 16, height: 44, borderRadius: 14,
  },
  addBtnText: { fontWeight: "900", color: "#1E3A8A", fontSize: 10 },
  searchbar: { backgroundColor: "rgba(255,255,255,0.12)", borderRadius: 14, height: 46 },
  searchbarInput: { fontSize: 13, fontWeight: "600", color: "#fff" },
  loadingContainer: { flex: 1, alignItems: "center", justifyContent: "center" },
  loadingText: { marginTop: 12, color: "#94A3B8", fontWeight: "700", fontSize: 12 },
  statsBar: {
    backgroundColor: "#FFFFFF", flexDirection: "row", borderBottomWidth: 1, borderBottomColor: "#F1F5F9",
  },
  statBox: { flex: 1, alignItems: "center", paddingVertical: 12 },
  statBoxBorder: { borderRightWidth: 1, borderRightColor: "#F1F5F9" },
  statValue: { fontSize: 18, fontWeight: "900", color: "#1E3A8A" },
  statLabel: { fontSize: 9, color: "#94A3B8", fontWeight: "700", textTransform: "uppercase", letterSpacing: 1, marginTop: 2 },
  emptyTable: { alignItems: "center", paddingTop: 64, paddingBottom: 40, paddingHorizontal: 20 },
  emptyText: { marginTop: 12, color: "#94A3B8", fontWeight: "800", fontSize: 14, textAlign: "center" },
  emptyAddBtn: {
    marginTop: 16, flexDirection: "row", alignItems: "center", gap: 8,
    backgroundColor: "#1E3A8A", paddingHorizontal: 24, paddingVertical: 12, borderRadius: 16,
  },
  emptyAddBtnText: { color: "#FFFFFF", fontWeight: "900", fontSize: 12 },
  footerContainer: {
    backgroundColor: "#FFFFFF", borderTopWidth: 1, borderTopColor: "#F1F5F9",
    paddingHorizontal: 16, paddingVertical: 12,
  },
  footerRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 8 },
  pageSizeBtn: {
    flexDirection: "row", alignItems: "center", gap: 4,
    backgroundColor: "#F1F5F9", paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8,
  },
  pageSizeText: { fontSize: 10, fontWeight: "700", color: "#475569" },
  entriesInfo: { fontSize: 10, fontWeight: "700", color: "#64748B", textAlign: "center" },
  pagination: { flexDirection: "row", alignItems: "center", gap: 4 },
  paginationBtn: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, borderWidth: 1 },
  paginationBtnDisabled: { backgroundColor: "#F8FAFC", borderColor: "#E2E8F0" },
  paginationBtnActive: { backgroundColor: "#1E3A8A", borderColor: "#1E3A8A" },
  paginationBtnText: { fontSize: 10, fontWeight: "800" },
  paginationTextDisabled: { color: "#CBD5E1" },
  paginationTextActive: { color: "#FFFFFF" },
  pageNumBtn: { width: 28, height: 28, borderRadius: 8, alignItems: "center", justifyContent: "center", backgroundColor: "#F8FAFC" },
  pageNumBtnActive: { backgroundColor: "#1E3A8A" },
  pageNumText: { fontSize: 10, fontWeight: "800", color: "#64748B" },
  pageNumTextActive: { color: "#FFFFFF" },
  exportModal: { backgroundColor: "white", marginHorizontal: 40, borderRadius: 16, padding: 16 },
  exportModalTitle: { fontSize: 14, fontWeight: "900", color: "#1E293B", marginBottom: 12 },
  exportOption: {
    flexDirection: "row", alignItems: "center", gap: 12,
    paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: "#F1F5F9",
  },
  exportOptionText: { fontSize: 12, fontWeight: "700", color: "#1E293B" },
  exportRangeRow: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 12, paddingHorizontal: 16 },
  exportRangeLabel: { fontSize: 11, fontWeight: "700", color: "#64748B", marginRight: 4 },
  exportRangeBtn: { flex: 1, paddingVertical: 8, borderRadius: 8, alignItems: "center", borderWidth: 1, borderColor: "#E2E8F0", backgroundColor: "#F8FAFC" },
  exportRangeBtnActive: { backgroundColor: "#1E3A8A", borderColor: "#1E3A8A" },
  exportRangeBtnText: { fontSize: 10, fontWeight: "800", color: "#64748B" },
  exportRangeBtnTextActive: { color: "#FFFFFF" },
  exportCancel: { marginTop: 8, alignItems: "center", paddingVertical: 8 },
  exportCancelText: { fontSize: 10, fontWeight: "700", color: "#94A3B8" },
  pageSizeModal: { backgroundColor: "white", marginHorizontal: 100, borderRadius: 16, padding: 16 },
  pageSizeOption: { paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: "#F1F5F9", alignItems: "center" },
  pageSizeOptionActive: { backgroundColor: "#EFF6FF" },
  pageSizeOptionText: { fontSize: 14, fontWeight: "700", color: "#1E293B" },
  pageSizeOptionTextActive: { color: "#1E3A8A" },
  tableScroll: { flex: 1 },
  tableContainer: { minWidth: 900, paddingHorizontal: 12 },
  tableHeaderRow: {
    flexDirection: "row", backgroundColor: "#1E3A8A", borderRadius: 12,
    marginTop: 12, marginBottom: 4, overflow: "hidden",
  },
  tableHeaderCell: { paddingVertical: 12, paddingHorizontal: 8 },
  tableHeaderContent: { flexDirection: "row", alignItems: "center" },
  tableHeaderText: { fontSize: 9, fontWeight: "900", color: "#FFFFFF", textTransform: "uppercase", letterSpacing: 0.5 },
  tableRow: {
    flexDirection: "row", backgroundColor: "#FFFFFF",
    borderBottomWidth: 1, borderBottomColor: "#F1F5F9", minHeight: 52, alignItems: "center",
  },
  tableRowAlt: { backgroundColor: "#FAFBFC" },
  tableCell: { paddingVertical: 10, paddingHorizontal: 8, justifyContent: "center" },
  cellRef: { fontSize: 11, fontWeight: "900", color: "#1E3A8A" },
  cellText: { fontSize: 11, fontWeight: "600", color: "#475569" },
  cellFare: { fontSize: 11, fontWeight: "800", color: "#0F172A" },
  cellDate: { fontSize: 10, fontWeight: "600", color: "#64748B" },
  actionBtn: {
    width: 28, height: 28, borderRadius: 8, backgroundColor: "#F1F5F9",
    alignItems: "center", justifyContent: "center",
  },
  pdfModalContent: { backgroundColor: "#fff", margin: 14, borderRadius: 24, height: "85%" },
  pdfModalHeader: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingHorizontal: 20, paddingTop: 20, paddingBottom: 16, borderBottomWidth: 1, borderBottomColor: "#F1F5F9",
  },
  pdfModalTitle: { fontSize: 16, fontWeight: "900", color: "#0F172A" },
  pdfContainer: { flex: 1, margin: 12, borderRadius: 12, overflow: "hidden" },
  filterBar: {
    backgroundColor: "#FFFFFF", borderBottomWidth: 1, borderBottomColor: "#E2E8F0",
    paddingHorizontal: 12, paddingVertical: 8,
  },
  filterRow: {
    flexDirection: "row", flexWrap: "wrap", gap: 8, alignItems: "flex-end",
  },
  filterItem: { flex: 1, minWidth: 130 },
  filterLabel: {
    fontSize: 8, fontWeight: "800", color: "#64748B", textTransform: "uppercase",
    letterSpacing: 1, marginBottom: 4,
  },
  clearFilterBtn: {
    flexDirection: "row", alignItems: "center", gap: 4,
    paddingHorizontal: 12, paddingVertical: 10, marginBottom: 12,
  },
  clearFilterText: { fontSize: 10, fontWeight: "800", color: "#ef4444" },
  errorBanner: {
    flexDirection: "row", alignItems: "center", backgroundColor: "#FEF2F2",
    paddingHorizontal: 16, paddingVertical: 10, marginHorizontal: 12, marginTop: 8,
    borderRadius: 12, gap: 8,
  },
  errorBannerText: { flex: 1, fontSize: 11, color: "#DC2626", fontWeight: "700" },
});
