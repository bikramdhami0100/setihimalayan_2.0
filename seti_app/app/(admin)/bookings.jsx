import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  View, Text, SafeAreaView, ScrollView, TouchableOpacity,
  ActivityIndicator, Alert, FlatList, RefreshControl,
  KeyboardAvoidingView, Platform, StatusBar, StyleSheet,
} from "react-native";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { Portal, Modal, TextInput, Searchbar, Menu } from "react-native-paper";
import * as Print      from "expo-print";
import * as Sharing    from "expo-sharing";
import * as FileSystem from "expo-file-system";
import Animated, { FadeInDown } from "react-native-reanimated";
import { createBooking, deleteBooking, updateBooking } from "../../api/bookings";
import { useAdminData } from "../../context/AdminContext";

const BOOKING_STATUSES = ["pending_payment", "confirmed", "cancelled", "expired", "refunded"];

const STATUS_CFG = {
  confirmed:      { dot: { backgroundColor: '#22C55E' }, badge: { backgroundColor: '#DCFCE7' }, text: { color: '#15803D' }, label: "CONFIRMED"      },
  pending_payment:{ dot: { backgroundColor: '#EAB308' }, badge: { backgroundColor: '#FEF9C3' }, text: { color: '#A16207' }, label: "PENDING"        },
  cancelled:      { dot: { backgroundColor: '#EF4444' }, badge: { backgroundColor: '#FEE2E2' }, text: { color: '#B91C1C' }, label: "CANCELLED"      },
  expired:        { dot: { backgroundColor: '#64748B' }, badge: { backgroundColor: '#F1F5F9' }, text: { color: '#334155' }, label: "EXPIRED"        },
  refunded:       { dot: { backgroundColor: '#A855F7' }, badge: { backgroundColor: '#F3E8FF' }, text: { color: '#7E22CE' }, label: "REFUNDED"       },
};

const EMPTY_FORM = {
  user_id: "",
  schedule_id: "",
  seats: "1",
  status: "pending_payment",
};

const formatDateTime = (dateStr) => {
  if (!dateStr) return "—";
  const d = new Date(dateStr);
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

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

const SectionLabel = ({ children }) => (
  <Text style={styles.sectionLabel}>{children}</Text>
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
          style={styles.dropdownAnchor}
        >
          <Text style={styles.dropdownAnchorText}>
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
    pending_payment: { backgroundColor: '#EAB308', borderColor: '#EAB308' },
    confirmed:       { backgroundColor: '#16A34A', borderColor: '#16A34A' },
    cancelled:       { backgroundColor: '#DC2626', borderColor: '#DC2626' },
    expired:         { backgroundColor: '#64748B', borderColor: '#64748B' },
    refunded:        { backgroundColor: '#9333EA', borderColor: '#9333EA' },
  };
  return (
    <View style={styles.pillRowContainer}>
      {options.map((opt) => {
        const on = value === opt;
        const activeBg = activeBgMap[opt] || { backgroundColor: '#1E3A8A', borderColor: '#1E3A8A' };
        return (
          <TouchableOpacity
            key={opt}
            onPress={() => onChange(opt)}
            style={[styles.pill, on ? activeBg : styles.pillInactive]}
          >
            <Text style={[styles.pillText, on ? styles.pillTextActive : styles.pillTextInactive]}>{opt}</Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
};

const StatusBadge = ({ status }) => {
  const s = STATUS_CFG[status] ?? STATUS_CFG.pending_payment;
  return (
    <View style={[styles.statusBadgeContainer, s.badge]}>
      <View style={[styles.statusDot, s.dot]} />
      <Text style={[styles.statusLabel, s.text]}>{s.label}</Text>
    </View>
  );
};

const BookingCard = React.memo(({ item, index, onEdit, onDelete, onView }) => (
  <Animated.View entering={FadeInDown.delay(index * 40).springify()}>
    <View
      style={styles.bookingCard}
    >
      <View style={styles.bookingCardHeader}>
        <View style={styles.bookingCardLeft}>
          <View style={styles.bookingIconBox}>
            <MaterialCommunityIcons name="ticket-confirmation-outline" size={22} color="#1e3a8a" />
          </View>
          <View style={styles.bookingRefContainer}>
            <Text style={styles.bookingRef} numberOfLines={1}>
              {item.booking_reference}
            </Text>
            <Text style={styles.bookingName}>
              {item.user_name}
            </Text>
          </View>
        </View>
        <StatusBadge status={item.status} />
      </View>

      <View style={styles.bookingDetails}>
        <View style={styles.bookingDetailItem}>
          <Ionicons name="navigate-outline" size={13} color="#94a3b8" />
          <Text style={styles.bookingDetailText}>
            {item.origin} → {item.destination}
          </Text>
        </View>
        <View style={styles.bookingDetailItem}>
          <Ionicons name="time-outline" size={13} color="#94a3b8" />
          <Text style={styles.bookingDetailText}>{formatDateTime(item.departure_time)}</Text>
        </View>
        <View style={styles.bookingDetailItem}>
          <Ionicons name="bus-outline" size={13} color="#94a3b8" />
          <Text style={styles.bookingDetailText}>{item.bus_number} ({item.bus_type})</Text>
        </View>
      </View>

      <View style={styles.bookingCardFooter}>
        <Text style={styles.bookingAmount}>Rs. {item.total_amount}</Text>
        <View style={styles.bookingActions}>
          <TouchableOpacity onPress={() => onView(item)} style={styles.actionBtnView}>
            <Ionicons name="eye-outline" size={13} color="#1e3a8a" />
            <Text style={styles.actionBtnTextView}>View</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => onEdit(item)} style={styles.actionBtnEdit}>
            <Ionicons name="pencil-outline" size={13} color="#475569" />
            <Text style={styles.actionBtnTextEdit}>Edit</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => onDelete(item.id, item.booking_reference)}
            style={styles.actionBtnDelete}
          >
            <Ionicons name="trash-outline" size={13} color="#ef4444" />
            <Text style={styles.actionBtnTextDelete}>Delete</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  </Animated.View>
));

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
        contentContainerStyle={styles.modalContent}
      >
        <KeyboardAvoidingView style={styles.flex1} behavior={Platform.OS === "ios" ? "padding" : "height"}>
          <View style={styles.flex1}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalTitle}>
                  {editingBooking ? "Edit Booking" : "New Booking"}
                </Text>
                <Text style={styles.modalSubtitle}>
                  {editingBooking ? `Updating ${editingBooking.booking_reference}` : "Create a new booking"}
                </Text>
              </View>
              <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
                <Ionicons name="close" size={17} color="#64748b" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.flex1} contentContainerStyle={{ paddingBottom: 30, paddingHorizontal: 20 }} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
              <SectionLabel>Passenger</SectionLabel>
              <Dropdown label="User" value={form.user_id} options={userOptions} onSelect={(v) => setForm({ ...form, user_id: v })} />

              <SectionLabel>Schedule</SectionLabel>
              <Dropdown label="Schedule" value={form.schedule_id} options={scheduleOptions} onSelect={(v) => setForm({ ...form, schedule_id: v })} />

              <SectionLabel>Seats</SectionLabel>
              <Field label="Number of Seats" value={form.seats} onChangeText={(t) => setForm({ ...form, seats: t })} keyboardType="numeric" />

              <SectionLabel>Status</SectionLabel>
              <PillRow options={BOOKING_STATUSES} value={form.status} onChange={(v) => setForm({ ...form, status: v })} />

              <View style={styles.formActions}>
                <TouchableOpacity onPress={onClose} style={styles.cancelBtn}>
                  <Text style={styles.cancelBtnText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={onSave}
                  disabled={saving}
                  style={styles.saveBtn}
                >
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
      <Modal
        visible={visible}
        onDismiss={onClose}
        contentContainerStyle={styles.modalContent}
      >
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
            <View style={styles.viewStatusContainer}>
              <StatusBadge status={booking.status} />
            </View>

            <Text style={styles.sectionLabel}>Passenger</Text>
            <View style={styles.viewField}><Text style={styles.viewFieldValue}>{booking.user_name}</Text></View>

            <Text style={styles.sectionLabel}>Route</Text>
            <View style={styles.viewField}><Text style={styles.viewFieldValue}>{booking.origin} → {booking.destination}</Text></View>

            <Text style={styles.sectionLabel}>Schedule</Text>
            <View style={styles.viewField}><Text style={styles.viewFieldValue}>Departure: {formatDateTime(booking.departure_time)}</Text></View>

            <Text style={styles.sectionLabel}>Bus</Text>
            <View style={styles.viewField}><Text style={styles.viewFieldValue}>{booking.bus_number} ({booking.bus_type})</Text></View>

            <Text style={styles.sectionLabel}>Payment</Text>
            <View style={styles.viewField}><Text style={styles.viewFieldValue}>Amount: Rs. {booking.total_amount}</Text></View>

            <Text style={styles.sectionLabel}>Dates</Text>
            <View style={styles.viewField}><Text style={styles.viewFieldValue}>Created: {formatDateTime(booking.created_at)}</Text></View>
            <View style={styles.viewField}><Text style={styles.viewFieldValue}>Confirmed: {formatDateTime(booking.confirmed_at) || "—"}</Text></View>

            <View style={styles.formActions}>
              <TouchableOpacity onPress={onClose} style={styles.cancelBtn}>
                <Text style={styles.cancelBtnText}>Close</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>
      </Modal>
    </Portal>
  );
};

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
    <SafeAreaView style={styles.screen}>
      <StatusBar barStyle="light-content" backgroundColor="#1e3a8a" />

      <View style={styles.header}>
        <View style={styles.headerRow}>
          <View>
            <Text style={styles.headerTitle}>Booking Manager</Text>
            <Text style={styles.headerCount}>
              {totalItems} booking{totalItems !== 1 ? "s" : ""} found
            </Text>
          </View>

          <View style={styles.headerActions}>
            <TouchableOpacity
              onPress={() => setExportModalVisible(true)}
              disabled={exporting || bookings.length === 0}
              style={styles.exportBtn}
            >
              {exporting ? <ActivityIndicator size="small" color="#fff" /> : <Ionicons name="share-outline" size={20} color="#fff" />}
            </TouchableOpacity>
            <TouchableOpacity onPress={openCreate} style={styles.addBtn}>
              <Ionicons name="add-circle" size={17} color="#1e3a8a" />
              <Text style={styles.addBtnText}>ADD BOOKING</Text>
            </TouchableOpacity>
          </View>
        </View>

        <Searchbar
          placeholder="Search by reference, name, route..."
          onChangeText={handleSearch}
          value={searchInput}
          elevation={0}
          style={styles.searchbar}
          inputStyle={styles.searchbarInput}
          placeholderTextColor="rgba(255,255,255,0.4)"
          iconColor="rgba(255,255,255,0.6)"
        />
      </View>

      {loading && !refreshing ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator color="#1e3a8a" size="large" />
          <Text style={styles.loadingText}>Loading bookings...</Text>
        </View>
      ) : (
        <FlatList
          style={styles.flex1}
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
            <View style={styles.statsBar}>
              {[
                { label: "Total",       val: totalItems },
                { label: "Confirmed",   val: bookings.filter(b => b.status === "confirmed").length },
                { label: "Pending",     val: bookings.filter(b => b.status === "pending_payment").length },
                { label: "Cancelled",   val: bookings.filter(b => b.status === "cancelled").length },
              ].map(({ label, val }, i, arr) => (
                <View key={label} style={[styles.statBox, i < arr.length - 1 && styles.statBoxBorder]}>
                  <Text style={styles.statValue}>{val}</Text>
                  <Text style={styles.statLabel}>{label}</Text>
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
            <View style={styles.emptyContainer}>
              <MaterialCommunityIcons name="ticket-outline" size={72} color="#e2e8f0" />
              <Text style={styles.emptyText}>
                {searchQuery ? `No results for "${searchQuery}"` : "No bookings found"}
              </Text>
              {!searchQuery && (
                <TouchableOpacity onPress={openCreate} style={styles.emptyAddBtn}>
                  <Ionicons name="add" size={16} color="#fff" />
                  <Text style={styles.emptyAddBtnText}>Add First Booking</Text>
                </TouchableOpacity>
              )}
            </View>
          )}
          ListFooterComponent={() =>
            bookings.length > 0 ? (
              <View style={styles.footerContainer}>
                <View style={styles.footer}>
                  <Text style={styles.footerText}>
                    Page {page} / {totalPages} · {bookings.length} of {totalItems}
                  </Text>
                  <View style={styles.pagination}>
                    <TouchableOpacity
                      disabled={page <= 1}
                      onPress={() => updatePagination("bookings", { page: page - 1 })}
                      style={[styles.paginationBtn, page <= 1 ? styles.paginationBtnDisabled : styles.paginationBtnActive]}
                    >
                      <Text style={[styles.paginationText, page <= 1 ? styles.paginationTextDisabled : styles.paginationTextActive]}>← Prev</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      disabled={page >= totalPages}
                      onPress={() => updatePagination("bookings", { page: page + 1 })}
                      style={[styles.paginationBtn, page >= totalPages ? styles.paginationBtnDisabled : styles.paginationBtnActive]}
                    >
                      <Text style={[styles.paginationText, page >= totalPages ? styles.paginationTextDisabled : styles.paginationTextActive]}>Next →</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            ) : null
          }
        />
      )}

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

      <ViewBookingModal
        visible={viewModalVisible}
        booking={viewingBooking}
        onClose={() => setViewModalVisible(false)}
      />

      <Portal>
        <Modal
          visible={exportModalVisible}
          onDismiss={() => setExportModalVisible(false)}
          contentContainerStyle={styles.exportModal}
        >
          <Text style={styles.exportModalTitle}>Export Booking Data</Text>
          {[
            { key: "csv", icon: "grid-outline", label: "Export CSV" },
            { key: "pdf", icon: "document-text-outline", label: "Export PDF" },
          ].map(({ key, icon, label }) => (
            <TouchableOpacity
              key={key}
              onPress={() => handleExport(key)}
              style={styles.exportOption}
            >
              <Ionicons name={icon} size={18} color="#1e3a8a" />
              <Text style={styles.exportOptionText}>{label}</Text>
            </TouchableOpacity>
          ))}
          <TouchableOpacity onPress={() => setExportModalVisible(false)} style={styles.exportCancel}>
            <Text style={styles.exportCancelText}>Cancel</Text>
          </TouchableOpacity>
        </Modal>
      </Portal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex1: { flex: 1 },
  screen: { flex: 1, backgroundColor: '#F8FAFC' },
  sectionLabel: {
    color: '#1E3A8A',
    fontSize: 10,
    fontWeight: '900',
    textTransform: 'uppercase',
    letterSpacing: 2,
    marginTop: 20,
    marginBottom: 8,
  },
  dropdownAnchor: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginBottom: 12,
  },
  dropdownAnchorText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#64748B',
  },
  pillRowContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 8,
  },
  pill: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 9999,
    borderWidth: 1,
  },
  pillInactive: {
    backgroundColor: '#F1F5F9',
    borderColor: '#E2E8F0',
  },
  pillText: {
    fontSize: 10,
    fontWeight: '800',
  },
  pillTextActive: {
    color: '#FFFFFF',
  },
  pillTextInactive: {
    color: '#64748B',
  },
  statusBadgeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statusLabel: {
    fontSize: 9,
    fontWeight: '900',
  },
  bookingCard: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 12,
    marginBottom: 12,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    shadowColor: '#1e3a8a',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  bookingCardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  bookingCardLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  bookingIconBox: {
    backgroundColor: '#EFF6FF',
    padding: 10,
    borderRadius: 14,
  },
  bookingRefContainer: {
    flex: 1,
  },
  bookingRef: {
    fontSize: 14,
    fontWeight: '900',
    color: '#0F172A',
  },
  bookingName: {
    fontSize: 10,
    fontWeight: '700',
    color: '#64748B',
  },
  bookingDetails: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    paddingTop: 12,
    marginBottom: 12,
    borderTopWidth: 1,
    borderTopColor: '#F8FAFC',
  },
  bookingDetailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  bookingDetailText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#475569',
  },
  bookingCardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  bookingAmount: {
    fontSize: 12,
    fontWeight: '900',
    color: '#1E3A8A',
  },
  bookingActions: {
    flexDirection: 'row',
    gap: 8,
  },
  actionBtnView: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 14,
  },
  actionBtnTextView: {
    fontSize: 10,
    fontWeight: '800',
    color: '#1D4ED8',
  },
  actionBtnEdit: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 14,
  },
  actionBtnTextEdit: {
    fontSize: 10,
    fontWeight: '800',
    color: '#475569',
  },
  actionBtnDelete: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#FEF2F2',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 14,
  },
  actionBtnTextDelete: {
    fontSize: 10,
    fontWeight: '800',
    color: '#EF4444',
  },
  modalContent: {
    backgroundColor: '#fff',
    margin: 14,
    borderRadius: 24,
    maxHeight: '92%',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '900',
    color: '#0F172A',
  },
  modalSubtitle: {
    fontSize: 10,
    color: '#94A3B8',
    marginTop: 2,
  },
  closeBtn: {
    width: 36,
    height: 36,
    backgroundColor: '#F1F5F9',
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  formActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 16,
    marginBottom: 40,
  },
  cancelBtn: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: 'center',
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  cancelBtnText: {
    fontWeight: '800',
    color: '#64748B',
    fontSize: 12,
  },
  saveBtn: {
    flex: 2,
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: 'center',
    backgroundColor: '#1E3A8A',
    shadowColor: '#1e3a8a',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  saveBtnText: {
    fontWeight: '900',
    color: '#FFFFFF',
    fontSize: 12,
  },
  viewStatusContainer: {
    marginTop: 16,
    marginBottom: 12,
  },
  viewField: {
    marginBottom: 12,
  },
  viewFieldValue: {
    fontSize: 12,
    fontWeight: '600',
    color: '#0F172A',
  },
  header: {
    backgroundColor: '#1E3A8A',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 16,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: -0.5,
  },
  headerCount: {
    fontSize: 10,
    color: '#93C5FD',
    fontWeight: '600',
    marginTop: 2,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  exportBtn: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.15)',
  },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    height: 44,
    borderRadius: 14,
  },
  addBtnText: {
    fontWeight: '900',
    color: '#1E3A8A',
    fontSize: 10,
  },
  searchbar: {
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderRadius: 14,
    height: 46,
  },
  searchbarInput: {
    fontSize: 13,
    fontWeight: '600',
    color: '#fff',
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    marginTop: 12,
    color: '#94A3B8',
    fontWeight: '700',
    fontSize: 12,
  },
  statsBar: {
    backgroundColor: '#FFFFFF',
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  statBox: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 12,
  },
  statBoxBorder: {
    borderRightWidth: 1,
    borderRightColor: '#F1F5F9',
  },
  statValue: {
    fontSize: 18,
    fontWeight: '900',
    color: '#1E3A8A',
  },
  statLabel: {
    fontSize: 9,
    color: '#94A3B8',
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginTop: 2,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingTop: 96,
    paddingHorizontal: 40,
  },
  emptyText: {
    marginTop: 16,
    color: '#94A3B8',
    fontWeight: '800',
    fontSize: 14,
    textAlign: 'center',
  },
  emptyAddBtn: {
    marginTop: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#1E3A8A',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 16,
  },
  emptyAddBtnText: {
    color: '#FFFFFF',
    fontWeight: '900',
    fontSize: 12,
  },
  footerContainer: {
    marginHorizontal: 12,
    marginTop: 4,
    marginBottom: 24,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  footerText: {
    fontSize: 10,
    color: '#94A3B8',
    fontWeight: '700',
  },
  pagination: {
    flexDirection: 'row',
    gap: 8,
  },
  paginationBtn: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 14,
    borderWidth: 1,
  },
  paginationBtnDisabled: {
    backgroundColor: '#F8FAFC',
    borderColor: '#E2E8F0',
  },
  paginationBtnActive: {
    backgroundColor: '#1E3A8A',
    borderColor: '#1E3A8A',
  },
  paginationText: {
    fontSize: 10,
    fontWeight: '800',
  },
  paginationTextDisabled: {
    color: '#CBD5E1',
  },
  paginationTextActive: {
    color: '#FFFFFF',
  },
  exportModal: {
    backgroundColor: 'white',
    marginHorizontal: 40,
    borderRadius: 16,
    padding: 16,
  },
  exportModalTitle: {
    fontSize: 14,
    fontWeight: '900',
    color: '#1E293B',
    marginBottom: 12,
  },
  exportOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  exportOptionText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#1E293B',
  },
  exportCancel: {
    marginTop: 8,
    alignItems: 'center',
    paddingVertical: 8,
  },
  exportCancelText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#94A3B8',
  },
});
