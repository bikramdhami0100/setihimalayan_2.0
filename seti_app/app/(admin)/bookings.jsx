
/**
 * AdminBookings.jsx – Booking Manager (NativeWind / Tailwind CSS)
 *
 * Install once:
 *   npx expo install nativewind tailwindcss expo-print expo-sharing expo-file-system
 */

import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  View, Text, SafeAreaView, ScrollView, TouchableOpacity,
  ActivityIndicator, Alert, FlatList, RefreshControl,
  KeyboardAvoidingView, Platform, StatusBar,
} from "react-native";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { Portal, Modal, TextInput, Searchbar, Menu } from "react-native-paper";
import * as Print      from "expo-print";
import * as Sharing    from "expo-sharing";
import * as FileSystem from "expo-file-system";
import Animated, { FadeInDown } from "react-native-reanimated";
import { createBooking, deleteBooking, updateBooking } from "../../api/bookings";
import { useAdminData } from "../../context/AdminContext";

// ─── Static config ────────────────────────────────────────────────────────────
const BOOKING_STATUSES = ["pending_payment", "confirmed", "cancelled", "expired", "refunded"];

const STATUS_CFG = {
  confirmed:      { dot: "bg-green-500",  badge: "bg-green-100",  text: "text-green-700",  label: "CONFIRMED"      },
  pending_payment:{ dot: "bg-yellow-500", badge: "bg-yellow-100", text: "text-yellow-700", label: "PENDING"        },
  cancelled:      { dot: "bg-red-500",    badge: "bg-red-100",    text: "text-red-700",    label: "CANCELLED"      },
  expired:        { dot: "bg-gray-500",   badge: "bg-gray-100",   text: "text-gray-700",   label: "EXPIRED"        },
  refunded:       { dot: "bg-purple-500", badge: "bg-purple-100", text: "text-purple-700", label: "REFUNDED"       },
};

const EMPTY_FORM = {
  user_id: "",           // will store user id
  schedule_id: "",       // will store schedule id
  seats: "1",
  status: "pending_payment",
};

// ─── Pure helpers ─────────────────────────────────────────────────────────────
const formatDateTime = (dateStr) => {
  if (!dateStr) return "—";
  const d = new Date(dateStr);
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

// ─── Form mapping ────────────────────────────────────────────────────────────
const itemToForm = (item) => ({
  user_id:      item.user_id   ? String(item.user_id) : "",
  schedule_id:  item.schedule_id ? String(item.schedule_id) : "",
  seats:        item.seats     ? String(item.seats) : "1",
  status:       item.status    ?? "pending_payment",
});

const toPayload = (form) => ({
  user_id:     parseInt(form.user_id) || null,
  schedule_id: parseInt(form.schedule_id) || null,
  seats:       parseInt(form.seats) || 1,
  status:      form.status,
});

// ─── Export builders (HTML, CSV, PDF) – same as before, no changes needed ───
// ... (copy your existing buildHTML, buildCSV, shareFile, exportCSV, exportPDF from earlier version) ...
// For brevity I'm not repeating them here, but they should remain identical.
// Make sure to include the three export functions and all helpers exactly as in the previous booking code.
// ─── Export builders (HTML, CSV, PDF) ────────────────────────────────────────
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
</style></head><body>
<h1>📋 Booking Report</h1>
<p>Generated: ${new Date().toLocaleString()} · ${bookings.length} entries</p>
<table>
  <thead><tr>
    <th>#</th><th>Ref</th><th>Route</th><th>Departure</th><th>Bus</th><th>Passenger</th><th>Amount</th><th>Status</th>
  </tr></thead>
  <tbody>
    ${bookings.map((b, i) => `<tr>
      <td>${i+1}</td>
      <td><strong>${b.booking_reference}</strong></td>
      <td>${b.origin} → ${b.destination}</td>
      <td>${formatDateTime(b.departure_time)}</td>
      <td>${b.bus_number} (${b.bus_type})</td>
      <td>${b.user_name}</td>
      <td>Rs. ${b.total_amount}</td>
      <td><span class="badge ${b.status}">${b.status}</span></td>
    </tr>`).join("")}
  </tbody>
</table></body></html>`;

const buildCSV = (bookings) => {
  const H = ["ID","Reference","Origin","Destination","Departure","Bus","Bus Type","Passenger","Amount","Status","Created At","Confirmed At"];
  const E = (v) => `"${String(v ?? "").replace(/"/g, '""')}"`;
  const rows = bookings.map((b) => [
    b.id, b.booking_reference, b.origin, b.destination,
    formatDateTime(b.departure_time), b.bus_number, b.bus_type,
    b.user_name, b.total_amount, b.status,
    formatDateTime(b.created_at), formatDateTime(b.confirmed_at),
  ].map(E).join(","));
  return [H.map(E).join(","), ...rows].join("\r\n");
};

const shareFile = async (path, mimeType, dialogTitle) => {
  let uri = path;
  if (Platform.OS === 'android') {
    try {
      const contentUri = await FileSystem.getContentUriAsync(path);
      uri = contentUri.uri;
    } catch { uri = path; }
  }
  await Sharing.shareAsync(uri, { mimeType, dialogTitle });
};

const exportCSV = async (bookings) => {
  const csv = buildCSV(bookings);
  if (Platform.OS === "web") {
    // ... same web export logic ...
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `bookings_${Date.now()}.csv`;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
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
        const anchor = document.createElement("a");
        anchor.href = uri;
        anchor.download = `bookings_${Date.now()}.pdf`;
        document.body.appendChild(anchor);
        anchor.click();
        anchor.remove();
        return;
      }
    } catch (e) { console.warn('Web PDF export fallback:', e); }
    await Print.printAsync({ html });
    return;
  }
  const { uri } = await Print.printToFileAsync({ html });
  await shareFile(uri, "application/pdf", "Export PDF");
};

// ─── Reusable atoms ───────────────────────────────────────────────────────────
const SectionLabel = ({ children }) => (
  <Text className="text-blue-900 text-[10px] font-black uppercase tracking-widest mt-5 mb-2">{children}</Text>
);

const Field = ({ style, ...props }) => (
  <TextInput
    mode="outlined"
    activeOutlineColor="#1e3a8a"
    outlineColor="#e2e8f0"
    textColor="#0f172a"
    style={[{ backgroundColor: "#fff", marginBottom: 12 }, style]}
    theme={{ colors: { primary: "#1e3a8a" } }}
    {...props}
  />
);

const Dropdown = ({ label, value, options, onSelect, displayKey = "label", valueKey = "value" }) => {
  const [visible, setVisible] = useState(false);
  const selected = options.find(o => o[valueKey] == value);
  return (
    <Menu
      visible={visible}
      onDismiss={() => setVisible(false)}
      anchor={
        <TouchableOpacity
          onPress={() => setVisible(true)}
          className="bg-white border border-slate-200 rounded-xl px-4 py-3 mb-3"
        >
          <Text className="text-sm font-bold text-slate-500">
            {selected ? selected[displayKey] : `Select ${label}`}
          </Text>
        </TouchableOpacity>
      }>
      {options.map((opt) => (
        <Menu.Item
          key={opt[valueKey]}
          title={opt[displayKey]}
          onPress={() => { onSelect(opt[valueKey]); setVisible(false); }}
        />
      ))}
    </Menu>
  );
};

const PillRow = ({ options, value, onChange }) => {
  const activeBgMap = {
    pending_payment: "bg-yellow-500 border-yellow-500",
    confirmed:       "bg-green-600 border-green-600",
    cancelled:       "bg-red-600 border-red-600",
    expired:         "bg-gray-500 border-gray-500",
    refunded:        "bg-purple-600 border-purple-600",
  };
  return (
    <View className="flex-row flex-wrap gap-2 mb-2">
      {options.map((opt) => {
        const on = value === opt;
        const activeBg = activeBgMap[opt] || "bg-blue-900 border-blue-900";
        return (
          <TouchableOpacity
            key={opt}
            onPress={() => onChange(opt)}
            className={`px-4 py-2 rounded-full border ${on ? activeBg : "bg-slate-100 border-slate-200"}`}
          >
            <Text className={`text-xs font-extrabold ${on ? "text-white" : "text-slate-500"}`}>{opt}</Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
};

const StatusBadge = ({ status }) => {
  const s = STATUS_CFG[status] ?? STATUS_CFG.pending_payment;
  return (
    <View className={`flex-row items-center gap-1 px-2 py-1 rounded-lg ${s.badge}`}>
      <View className={`w-1.5 h-1.5 rounded-full ${s.dot}`} />
      <Text className={`text-[9px] font-black ${s.text}`}>{s.label}</Text>
    </View>
  );
};

// ─── Booking Card (now with Edit & Delete buttons) ──────────────────────────
const BookingCard = React.memo(({ item, index, onEdit, onDelete, onView }) => (
  <Animated.View entering={FadeInDown.delay(index * 40).springify()}>
    <View
      className="bg-white mx-3 mb-3 rounded-2xl p-4 border border-slate-100"
      style={{ shadowColor: "#1e3a8a", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 2 }}
    >
      <View className="flex-row items-start justify-between mb-3">
        <View className="flex-row items-center gap-3 flex-1">
          <View className="bg-blue-50 p-2.5 rounded-xl">
            <MaterialCommunityIcons name="ticket-confirmation-outline" size={22} color="#1e3a8a" />
          </View>
          <View className="flex-1">
            <Text className="text-base font-black text-slate-900" numberOfLines={1}>
              {item.booking_reference}
            </Text>
            <Text className="text-xs font-bold text-slate-500">
              {item.user_name}
            </Text>
          </View>
        </View>
        <StatusBadge status={item.status} />
      </View>

      <View className="flex-row flex-wrap gap-3 pt-3 mb-3 border-t border-slate-50">
        <View className="flex-row items-center gap-1">
          <Ionicons name="navigate-outline" size={13} color="#94a3b8" />
          <Text className="text-xs font-bold text-slate-600">
            {item.origin} → {item.destination}
          </Text>
        </View>
        <View className="flex-row items-center gap-1">
          <Ionicons name="time-outline" size={13} color="#94a3b8" />
          <Text className="text-xs font-bold text-slate-600">{formatDateTime(item.departure_time)}</Text>
        </View>
        <View className="flex-row items-center gap-1">
          <Ionicons name="bus-outline" size={13} color="#94a3b8" />
          <Text className="text-xs font-bold text-slate-600">{item.bus_number} ({item.bus_type})</Text>
        </View>
      </View>

      <View className="flex-row items-center justify-between">
        <Text className="text-sm font-black text-blue-900">Rs. {item.total_amount}</Text>
        <View className="flex-row gap-2">
          <TouchableOpacity onPress={() => onView(item)} className="flex-row items-center gap-1 bg-blue-50 px-4 py-2 rounded-xl">
            <Ionicons name="eye-outline" size={13} color="#1e3a8a" />
            <Text className="text-xs font-extrabold text-blue-700">View</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => onEdit(item)} className="flex-row items-center gap-1 bg-slate-100 px-4 py-2 rounded-xl">
            <Ionicons name="pencil-outline" size={13} color="#475569" />
            <Text className="text-xs font-extrabold text-slate-600">Edit</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => onDelete(item.id, item.booking_reference)}
            className="flex-row items-center gap-1 bg-red-50 px-4 py-2 rounded-xl"
          >
            <Ionicons name="trash-outline" size={13} color="#ef4444" />
            <Text className="text-xs font-extrabold text-red-500">Delete</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  </Animated.View>
));

// ─── Create / Edit Form Modal ────────────────────────────────────────────────
const BookingForm = ({ visible, editingBooking, form, setForm, saving, onSave, onClose, users, schedules }) => {
  const userOptions = users.map(u => ({ label: `${u.full_name} (${u.email})`, value: u.id.toString() }));
  const scheduleOptions = schedules.map(s => ({
    label: `${s.bus_number} · ${s.origin} → ${s.destination} · ${formatDateTime(s.departure_time)}`,
    value: s.id.toString(),
  }));

  return (
    <Portal>
      <Modal
        visible={visible}
        onDismiss={onClose}
        contentContainerStyle={{ backgroundColor: "#fff", margin: 14, borderRadius: 24, maxHeight: "92%" }}
      >
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : "height"}>
          <View style={{ flex: 1 }}>
            <View className="flex-row items-center justify-between px-5 pt-5 pb-4 border-b border-slate-100">
              <View>
                <Text className="text-lg font-black text-slate-900">
                  {editingBooking ? "Edit Booking" : "New Booking"}
                </Text>
                <Text className="text-xs text-slate-400 mt-0.5">
                  {editingBooking ? `Updating ${editingBooking.booking_reference}` : "Create a new booking"}
                </Text>
              </View>
              <TouchableOpacity onPress={onClose} className="w-9 h-9 bg-slate-100 rounded-xl items-center justify-center">
                <Ionicons name="close" size={17} color="#64748b" />
              </TouchableOpacity>
            </View>

            <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 30 }} className="px-5" showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
              <SectionLabel>Passenger</SectionLabel>
              <Dropdown label="User" value={form.user_id} options={userOptions} onSelect={(v) => setForm({ ...form, user_id: v })} />

              <SectionLabel>Schedule</SectionLabel>
              <Dropdown label="Schedule" value={form.schedule_id} options={scheduleOptions} onSelect={(v) => setForm({ ...form, schedule_id: v })} />

              <SectionLabel>Seats</SectionLabel>
              <Field label="Number of Seats" value={form.seats} onChangeText={(t) => setForm({ ...form, seats: t })} keyboardType="numeric" />

              <SectionLabel>Status</SectionLabel>
              <PillRow options={BOOKING_STATUSES} value={form.status} onChange={(v) => setForm({ ...form, status: v })} />

              {/* Action buttons */}
              <View className="flex-row gap-3 mt-4 mb-10">
                <TouchableOpacity onPress={onClose} className="flex-1 py-4 rounded-2xl items-center bg-slate-100 border border-slate-200">
                  <Text className="font-extrabold text-slate-500 text-sm">Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={onSave}
                  disabled={saving}
                  className="flex-[2] py-4 rounded-2xl items-center bg-blue-900"
                  style={{ shadowColor: "#1e3a8a", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 5 }}
                >
                  {saving ? <ActivityIndicator color="#fff" /> : <Text className="font-black text-white text-sm">{editingBooking ? "UPDATE BOOKING" : "CREATE BOOKING"}</Text>}
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </Portal>
  );
};

// ─── View Booking Modal (unchanged from previous version) ───────────────────
// ─── View Booking Modal ──────────────────────────────────────────────────────
const ViewBookingModal = ({ visible, booking, onClose }) => {
  if (!booking) return null;
  return (
    <Portal>
      <Modal
        visible={visible}
        onDismiss={onClose}
        contentContainerStyle={{ backgroundColor: "#fff", margin: 14, borderRadius: 24, maxHeight: "92%" }}
      >
        <View style={{ flex: 1 }}>
          <View className="flex-row items-center justify-between px-5 pt-5 pb-4 border-b border-slate-100">
            <View>
              <Text className="text-lg font-black text-slate-900">Booking Details</Text>
              <Text className="text-xs text-slate-400 mt-0.5">{booking.booking_reference}</Text>
            </View>
            <TouchableOpacity onPress={onClose} className="w-9 h-9 bg-slate-100 rounded-xl items-center justify-center">
              <Ionicons name="close" size={17} color="#64748b" />
            </TouchableOpacity>
          </View>

          <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 30 }} className="px-5" showsVerticalScrollIndicator={false}>
            {/* Status badge */}
            <View className="mt-4 mb-3">
              <StatusBadge status={booking.status} />
            </View>

            {/* Basic info */}
            <Text className="text-blue-900 text-[10px] font-black uppercase tracking-widest mt-5 mb-2">Passenger</Text>
            <View className="mb-3"><Text className="text-sm font-semibold text-slate-900">{booking.user_name}</Text></View>

            <Text className="text-blue-900 text-[10px] font-black uppercase tracking-widest mt-5 mb-2">Route</Text>
            <View className="mb-3"><Text className="text-sm font-semibold text-slate-900">{booking.origin} → {booking.destination}</Text></View>

            <Text className="text-blue-900 text-[10px] font-black uppercase tracking-widest mt-5 mb-2">Schedule</Text>
            <View className="mb-3"><Text className="text-sm font-semibold text-slate-900">Departure: {formatDateTime(booking.departure_time)}</Text></View>

            <Text className="text-blue-900 text-[10px] font-black uppercase tracking-widest mt-5 mb-2">Bus</Text>
            <View className="mb-3"><Text className="text-sm font-semibold text-slate-900">{booking.bus_number} ({booking.bus_type})</Text></View>

            <Text className="text-blue-900 text-[10px] font-black uppercase tracking-widest mt-5 mb-2">Payment</Text>
            <View className="mb-3"><Text className="text-sm font-semibold text-slate-900">Amount: Rs. {booking.total_amount}</Text></View>

            <Text className="text-blue-900 text-[10px] font-black uppercase tracking-widest mt-5 mb-2">Dates</Text>
            <View className="mb-3"><Text className="text-sm font-semibold text-slate-900">Created: {formatDateTime(booking.created_at)}</Text></View>
            <View className="mb-3"><Text className="text-sm font-semibold text-slate-900">Confirmed: {formatDateTime(booking.confirmed_at) || "—"}</Text></View>

            <View className="flex-row gap-3 mt-4 mb-10">
              <TouchableOpacity onPress={onClose} className="flex-1 py-4 rounded-2xl items-center bg-slate-100 border border-slate-200">
                <Text className="font-extrabold text-slate-500 text-sm">Close</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>
      </Modal>
    </Portal>
  );
};
// ─── Main Screen ─────────────────────────────────────────────────────────────
export default function AdminBookings() {
  const {
    bookings,
    users,
    schedules,
    loading:    loadingStates,
    refreshing: refreshingStates,
    getPagination,
    updatePagination,
    getSearchQuery,
    updateSearchQuery,
    fetchBookings,
  } = useAdminData();

  const loading    = loadingStates.bookings;
  const refreshing = refreshingStates.bookings;
  const { page, limit, total: totalItems } = getPagination("bookings");
  const searchQuery = getSearchQuery("bookings");

  const [searchInput,    setSearchInput]    = useState(searchQuery);
  const [modalVisible,   setModalVisible]   = useState(false);
  const [viewModalVisible, setViewModalVisible] = useState(false);
  const [exportModalVisible, setExportModalVisible] = useState(false);
  const [editingBooking, setEditingBooking] = useState(null);
  const [viewingBooking, setViewingBooking] = useState(null);
  const [saving,         setSaving]         = useState(false);
  const [deleting,       setDeleting]       = useState(false);
  const [exporting,      setExporting]      = useState(false);
  const [form,           setForm]           = useState({ ...EMPTY_FORM });
  const debounceRef = useRef(null);

  useEffect(() => { fetchBookings(); }, [page, limit, searchQuery]);

  const commitSearch = useCallback(
    (text) => updateSearchQuery("bookings", text),
    [updateSearchQuery],
  );

  const handleSearch = (text) => {
    setSearchInput(text);
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => commitSearch(text), 500);
  };

  const openCreate = () => { setEditingBooking(null); setForm({ ...EMPTY_FORM }); setModalVisible(true); };
  const openEdit   = (item) => { setEditingBooking(item); setForm(itemToForm(item)); setModalVisible(true); };
  const openView   = (item) => { setViewingBooking(item); setViewModalVisible(true); };

  const handleSave = async () => {
    if (!form.user_id || !form.schedule_id) {
      return Alert.alert("Required", "User and Schedule are required.");
    }
    setSaving(true);
    try {
      if (editingBooking) {
        await updateBooking(editingBooking.id, toPayload(form));
      } else {
        await createBooking(toPayload(form));
      }
      setModalVisible(false);
      fetchBookings(true);
    } catch (e) {
      const msg = e?.response?.data?.message || e.message || "Could not save booking.";
      Alert.alert("Error", msg);
    } finally { setSaving(false); }
  };

  const handleDelete = (id, ref) => {
    Alert.alert("Remove Booking", `Delete booking "${ref}"?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          setDeleting(true);
          try {
            await deleteBooking(id);
            fetchBookings(true);
          } catch (e) {
            Alert.alert("Error", "Could not delete booking.");
          } finally { setDeleting(false); }
        },
      },
    ]);
  };

  const handleExport = async (type) => {
    setExportModalVisible(false);
    setExporting(true);
    try {
      if (type === "csv") await exportCSV(bookings);
      if (type === "pdf") await exportPDF(bookings);
    } catch (e) {
      Alert.alert("Export Failed", e.message || "Something went wrong.");
    } finally { setExporting(false); }
  };

  const totalPages = Math.ceil(totalItems / limit) || 1;

  return (
    <SafeAreaView style={{ flex: 1 }} className="bg-slate-50">
      <StatusBar barStyle="light-content" backgroundColor="#1e3a8a" />

      {/* Header */}
      <View className="bg-blue-900 px-4 pt-4 pb-4">
        <View className="flex-row items-center justify-between mb-3">
          <View>
            <Text className="text-xl font-black text-white tracking-tight">Booking Manager</Text>
            <Text className="text-xs text-blue-300 font-semibold mt-0.5">
              {totalItems} booking{totalItems !== 1 ? "s" : ""} found
            </Text>
          </View>

          <View className="flex-row items-center gap-2">
            <TouchableOpacity
              onPress={() => setExportModalVisible(true)}
              disabled={exporting || bookings.length === 0}
              className="w-11 h-11 rounded-xl items-center justify-center"
              style={{ backgroundColor: "rgba(255,255,255,0.15)" }}
            >
              {exporting ? <ActivityIndicator size="small" color="#fff" /> : <Ionicons name="share-outline" size={20} color="#fff" />}
            </TouchableOpacity>
            <TouchableOpacity onPress={openCreate} className="flex-row items-center gap-1.5 bg-white px-4 h-11 rounded-xl">
              <Ionicons name="add-circle" size={17} color="#1e3a8a" />
              <Text className="font-black text-blue-900 text-xs">ADD BOOKING</Text>
            </TouchableOpacity>
          </View>
        </View>

        <Searchbar
          placeholder="Search by reference, name, route..."
          onChangeText={handleSearch}
          value={searchInput}
          elevation={0}
          style={{ backgroundColor: "rgba(255,255,255,0.12)", borderRadius: 14, height: 46 }}
          inputStyle={{ fontSize: 13, fontWeight: "600", color: "#fff" }}
          placeholderTextColor="rgba(255,255,255,0.4)"
          iconColor="rgba(255,255,255,0.6)"
        />
      </View>

      {/* Content */}
      {loading && !refreshing ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color="#1e3a8a" size="large" />
          <Text className="mt-3 text-slate-400 font-bold text-sm">Loading bookings...</Text>
        </View>
      ) : (
        <FlatList
          style={{ flex: 1 }}
          data={bookings}
          keyExtractor={(item) => item.id?.toString()}
          renderItem={({ item, index }) => (
            <BookingCard
              item={item}
              index={index}
              onEdit={openEdit}
              onDelete={handleDelete}
              onView={openView}
            />
          )}
          contentContainerStyle={{ flexGrow: 1, paddingTop: 14, paddingBottom: 24 }}
          showsVerticalScrollIndicator={false}
          nestedScrollEnabled={true}
          keyboardShouldPersistTaps="handled"
          ListHeaderComponent={
            <View className="bg-white flex-row border-b border-slate-100">
              {[
                { label: "Total",       val: totalItems },
                { label: "Confirmed",   val: bookings.filter(b => b.status === "confirmed").length },
                { label: "Pending",     val: bookings.filter(b => b.status === "pending_payment").length },
                { label: "Cancelled",   val: bookings.filter(b => b.status === "cancelled").length },
              ].map(({ label, val }, i, arr) => (
                <View key={label} className={`flex-1 items-center py-3 ${i < arr.length - 1 ? "border-r border-slate-100" : ""}`}>
                  <Text className="text-xl font-black text-blue-900">{val}</Text>
                  <Text className="text-[9px] text-slate-400 font-bold uppercase tracking-wider mt-0.5">{label}</Text>
                </View>
              ))}
            </View>
          }
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => fetchBookings(true)}
              tintColor="#1e3a8a"
              colors={["#1e3a8a"]}
            />
          }
          ListEmptyComponent={() => (
            <View className="items-center pt-24 px-10">
              <MaterialCommunityIcons name="ticket-outline" size={72} color="#e2e8f0" />
              <Text className="mt-4 text-slate-400 font-extrabold text-base text-center">
                {searchQuery ? `No results for "${searchQuery}"` : "No bookings found"}
              </Text>
              {!searchQuery && (
                <TouchableOpacity onPress={openCreate} className="mt-5 flex-row items-center gap-2 bg-blue-900 px-6 py-3 rounded-2xl">
                  <Ionicons name="add" size={16} color="#fff" />
                  <Text className="text-white font-black text-sm">Add First Booking</Text>
                </TouchableOpacity>
              )}
            </View>
          )}
          ListFooterComponent={() =>
            bookings.length > 0 ? (
              <View className="mx-3 mt-1 mb-6">
                <View className="flex-row items-center justify-between bg-white rounded-2xl px-4 py-3 border border-slate-100">
                  <Text className="text-xs text-slate-400 font-bold">
                    Page {page} / {totalPages} · {bookings.length} of {totalItems}
                  </Text>
                  <View className="flex-row gap-2">
                    <TouchableOpacity
                      disabled={page <= 1}
                      onPress={() => updatePagination("bookings", { page: page - 1 })}
                      className={`px-4 py-2 rounded-xl border ${page <= 1 ? "bg-slate-50 border-slate-200" : "bg-blue-900 border-blue-900"}`}
                    >
                      <Text className={`text-xs font-extrabold ${page <= 1 ? "text-slate-300" : "text-white"}`}>← Prev</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      disabled={page >= totalPages}
                      onPress={() => updatePagination("bookings", { page: page + 1 })}
                      className={`px-4 py-2 rounded-xl border ${page >= totalPages ? "bg-slate-50 border-slate-200" : "bg-blue-900 border-blue-900"}`}
                    >
                      <Text className={`text-xs font-extrabold ${page >= totalPages ? "text-slate-300" : "text-white"}`}>Next →</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            ) : null
          }
        />
      )}

      {/* Form Modal */}
      <BookingForm
        visible={modalVisible}
        editingBooking={editingBooking}
        form={form}
        setForm={setForm}
        saving={saving}
        onSave={handleSave}
        onClose={() => setModalVisible(false)}
        users={users}
        schedules={schedules}
      />

      {/* View Modal */}
      <ViewBookingModal
        visible={viewModalVisible}
        booking={viewingBooking}
        onClose={() => setViewModalVisible(false)}
      />

      {/* Export modal */}
      <Portal>
        <Modal
          visible={exportModalVisible}
          onDismiss={() => setExportModalVisible(false)}
          contentContainerStyle={{ backgroundColor: "white", marginHorizontal: 40, borderRadius: 16, padding: 16 }}
        >
          <Text className="text-base font-black text-slate-800 mb-3">Export Booking Data</Text>
          {[
            { key: "csv", icon: "grid-outline", label: "Export CSV" },
            { key: "pdf", icon: "document-text-outline", label: "Export PDF" },
          ].map(({ key, icon, label }) => (
            <TouchableOpacity
              key={key}
              onPress={() => handleExport(key)}
              className="flex-row items-center gap-3 px-4 py-3 border-b border-slate-100"
            >
              <Ionicons name={icon} size={18} color="#1e3a8a" />
              <Text className="text-sm font-bold text-slate-800">{label}</Text>
            </TouchableOpacity>
          ))}
          <TouchableOpacity onPress={() => setExportModalVisible(false)} className="mt-2 items-center py-2">
            <Text className="text-xs font-bold text-slate-400">Cancel</Text>
          </TouchableOpacity>
        </Modal>
      </Portal>
    </SafeAreaView>
  );
}