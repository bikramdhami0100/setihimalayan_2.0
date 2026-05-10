import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  View, Text, SafeAreaView, ScrollView, TouchableOpacity,
  ActivityIndicator, Alert, FlatList, RefreshControl,
  KeyboardAvoidingView, Platform, StatusBar, StyleSheet,
} from "react-native";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { Portal, Modal, TextInput, Searchbar, Menu, Divider } from "react-native-paper";
import { Calendar } from "react-native-calendars";
import * as Print      from "expo-print";
import * as Sharing    from "expo-sharing";
import * as FileSystem from "expo-file-system";
import Animated, { FadeInDown } from "react-native-reanimated";
import { createSchedule, deleteSchedule, updateSchedule } from "../../api/schedules";
import { useAdminData } from "../../context/AdminContext";

const SCHEDULE_STATUSES = ["scheduled", "cancelled", "completed", "delayed"];
const normalizeStatus = (status) => status ?? "scheduled";
const normalizeSchedule = (item) => ({ ...item, status: normalizeStatus(item.status) });

const STATUS_CFG = {
  scheduled: { dot: { backgroundColor: '#3B82F6' }, badge: { backgroundColor: '#DBEAFE' }, text: { color: '#1D4ED8' }, label: "SCHEDULED" },
  cancelled: { dot: { backgroundColor: '#EF4444' }, badge: { backgroundColor: '#FEE2E2' }, text: { color: '#B91C1C' }, label: "CANCELLED" },
  completed: { dot: { backgroundColor: '#22C55E' }, badge: { backgroundColor: '#DCFCE7' }, text: { color: '#15803D' }, label: "COMPLETED" },
  delayed:   { dot: { backgroundColor: '#EAB308' }, badge: { backgroundColor: '#FEF9C3' }, text: { color: '#A16207' }, label: "DELAYED"   },
};

const EMPTY_FORM = {
  bus_id: "", route_id: "", departure_time: "", arrival_time: "",
  base_price: "", available_seats: "", total_seats: "",
  status: "scheduled", delay_minutes: "0",
  driver_name: "", driver_phone: "", conductor_name: "", conductor_phone: "", notes: "",
};
const itemToForm = (item) => {
  const fmt = (dt) => {
    if (!dt) return "";
    const d = new Date(dt);
    const pad = (n) => String(n).padStart(2, "0");
    return d.getFullYear() + "-" + pad(d.getMonth()+1) + "-" + pad(d.getDate()) + " " + pad(d.getHours()) + ":" + pad(d.getMinutes());
  };
  return {
    bus_id: String(item.bus_id ?? ""), route_id: String(item.route_id ?? ""),
    departure_time: fmt(item.departure_time), arrival_time: fmt(item.arrival_time),
    base_price: String(item.base_price ?? ""),
    available_seats: String(item.available_seats ?? item.total_seats ?? ""),
    total_seats: String(item.total_seats ?? ""), status: normalizeStatus(item.status),
    delay_minutes: String(item.delay_minutes ?? 0),
    driver_name: item.driver_name ?? "", driver_phone: item.driver_phone ?? "",
    conductor_name: item.conductor_name ?? "", conductor_phone: item.conductor_phone ?? "",
    notes: item.notes ?? "",
  };
};

const toPayload = (f) => {
  const parseDate = (str) => {
    if (!str) return null;
    try { return new Date(str).toISOString(); } catch { return null; }
  };
  return {
    bus_id: parseInt(f.bus_id) || null, route_id: parseInt(f.route_id) || null,
    departure_time: parseDate(f.departure_time), arrival_time: parseDate(f.arrival_time),
    base_price: parseFloat(f.base_price) || 0,
    total_seats: parseInt(f.total_seats) || 0, available_seats: parseInt(f.available_seats) || 0,
    status: f.status, delay_minutes: parseInt(f.delay_minutes) || 0,
    driver_name: f.driver_name || null, driver_phone: f.driver_phone || null,
    conductor_name: f.conductor_name || null, conductor_phone: f.conductor_phone || null,
    notes: f.notes || null,
  };
};
const buildHTML = (schedules) => '<!DOCTYPE html><html><head><meta charset="utf-8"/>' +
'<style>body{font-family:Arial,sans-serif;padding:28px;color:#1e293b}' +
'h1{color:#1e3a8a;font-size:22px;font-weight:900;margin:0}' +
'p{color:#64748b;font-size:12px;margin:4px 0 24px}' +
'table{width:100%;border-collapse:collapse;font-size:11px}' +
'th{background:#1e3a8a;color:#fff;padding:8px 10px;text-align:left;font-size:9px;text-transform:uppercase}' +
'td{padding:7px 10px;border-bottom:1px solid #e2e8f0}' +
'tr:nth-child(even) td{background:#f8fafc}' +
'.badge{display:inline-block;padding:2px 8px;border-radius:12px;font-size:9px;font-weight:700}' +
'.scheduled{background:#dbeafe;color:#1e40af}' +
'.cancelled{background:#fee2e2;color:#dc2626}' +
'.completed{background:#dcfce7;color:#16a34a}' +
'.delayed{background:#fef9c3;color:#ca8a04}' +
'</style></head><body>' +
'<h1>Schedule Report</h1>' +
'<p>Generated: ' + new Date().toLocaleString() + ' ' + schedules.length + ' entries</p>' +
'<table><thead><tr><th>#</th><th>Bus</th><th>Route</th><th>Departure</th><th>Arrival</th>' +
'<th>Price</th><th>Seats</th><th>Status</th><th>Driver</th><th>Conductor</th><th>Delay</th></tr></thead><tbody>' +
schedules.map((s, i) => '<tr><td>'+(i+1)+'</td>' +
'<td><strong>'+s.bus_number+'</strong> ('+s.bus_type+')</td>' +
'<td>'+s.origin+' '+s.destination+'</td>' +
'<td>'+s.departure_time+'</td>'+
'<td>'+s.arrival_time+'</td>'+
'<td>Rs. '+s.base_price+'</td>'+
'<td>'+s.available_seats+'/'+s.total_seats+'</td>'+
'<td><span class="badge '+s.status+'">'+s.status+'</span></td>'+
'<td>'+(s.driver_name||'')+'</td>'+
'<td>'+(s.conductor_name||'')+'</td>'+
'<td>'+s.delay_minutes+' min</td></tr>').join('') +
'</tbody></table></body></html>';

const buildCSV = (schedules) => {
  const H = ["ID","Bus","Bus Type","Route","Departure","Arrival","Price","Seats","Status","Driver","Conductor","Delay","Notes"];
  const E = (v) => '"'+String(v ?? "").replace(/"/g, '""')+'"';
  const rows = schedules.map((s) => [s.id, s.bus_number, s.bus_type, s.origin+' '+s.destination,
    s.departure_time, s.arrival_time, s.base_price,
    s.available_seats+'/'+s.total_seats, s.status,
    s.driver_name, s.conductor_name, s.delay_minutes, s.notes].map(E).join(","));
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

const exportCSV = async (schedules) => {
  const csv = buildCSV(schedules);
  if (Platform.OS === "web") {
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url; anchor.download = "schedules_"+Date.now()+".csv";
    document.body.appendChild(anchor); anchor.click(); anchor.remove();
    URL.revokeObjectURL(url); return;
  }
  const path = FileSystem.cacheDirectory + "schedules_" + Date.now() + ".csv";
  await FileSystem.writeAsStringAsync(path, csv, { encoding: FileSystem.EncodingType.UTF8 });
  await shareFile(path, "text/csv", "Export CSV");
};

const exportPDF = async (schedules) => {
  const html = buildHTML(schedules);
  if (Platform.OS === "web") {
    try {
      const { uri } = await Print.printToFileAsync({ html });
      if (uri) {
        const anchor = document.createElement("a");
        anchor.href = uri; anchor.download = "schedules_"+Date.now()+".pdf";
        document.body.appendChild(anchor); anchor.click(); anchor.remove(); return;
      }
    } catch (e) { console.warn('Web PDF export fallback:', e); }
    await Print.printAsync({ html }); return;
  }
  const { uri } = await Print.printToFileAsync({ html });
  await shareFile(uri, "application/pdf", "Export PDF");
};
const SectionLabel = ({ children }) => (<Text style={styles.sectionLabel}>{children}</Text>);

const Field = ({ style, ...props }) => (
  <TextInput mode="outlined" activeOutlineColor="#1e3a8a" outlineColor="#e2e8f0"
    textColor="#0f172a" style={[{ backgroundColor: "#fff", marginBottom: 12 }, style]}
    theme={{ colors: { primary: "#1e3a8a" } }} {...props} />
);

const Dropdown = ({ label, value, options, onSelect, displayKey = "label", valueKey = "value" }) => {
  const [visible, setVisible] = useState(false);
  const selected = options.find(o => o[valueKey] == value);
  return (
    <Menu visible={visible} onDismiss={() => setVisible(false)}
      anchor={<TouchableOpacity onPress={() => setVisible(true)} style={styles.dropdownAnchor}>
        <Text style={styles.dropdownAnchorText}>{selected ? selected[displayKey] : "Select "+label}</Text>
      </TouchableOpacity>}>
      {options.map((opt) => (<Menu.Item key={opt[valueKey]} title={opt[displayKey]}
        onPress={() => { onSelect(opt[valueKey]); setVisible(false); }} />))}
    </Menu>
  );
};

const PillRow = ({ options, value, onChange }) => {
  const activeBgMap = {
    scheduled: { backgroundColor: '#2563EB', borderColor: '#2563EB' },
    cancelled: { backgroundColor: '#DC2626', borderColor: '#DC2626' },
    completed: { backgroundColor: '#16A34A', borderColor: '#16A34A' },
    delayed:   { backgroundColor: '#EAB308', borderColor: '#EAB308' },
  };
  return (
    <View style={styles.pillRowContainer}>
      {options.map((opt) => {
        const on = value === opt;
        const activeBg = activeBgMap[opt] || { backgroundColor: '#1E3A8A', borderColor: '#1E3A8A' };
        return (
          <TouchableOpacity key={opt} onPress={() => onChange(opt)}
            style={[styles.pill, on ? activeBg : styles.pillInactive]}>
            <Text style={[styles.pillText, on ? styles.pillTextActive : styles.pillTextInactive]}>{opt}</Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
};

const StatusBadge = ({ status }) => {
  const s = STATUS_CFG[status] ?? STATUS_CFG.scheduled;
  return (
    <View style={[styles.statusBadgeContainer, s.badge]}>
      <View style={[styles.statusDot, s.dot]} />
      <Text style={[styles.statusLabel, s.text]}>{s.label}</Text>
    </View>
  );
};
const ScheduleCard = React.memo(({ item, index, onEdit, onDelete, onView, isDeleting }) => {
  const dep = new Date(item.departure_time);
  const arr = new Date(item.arrival_time);
  const timeFmt = (d) => d.toLocaleDateString() + " " + d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  return (
    <Animated.View entering={FadeInDown.delay(index * 40).springify()}>
      <View style={styles.scheduleCard}>
        <View style={styles.scheduleCardHeader}>
          <View style={styles.scheduleCardLeft}>
            <View style={styles.scheduleIconBox}>
              <MaterialCommunityIcons name="bus-clock" size={22} color="#1e3a8a" />
            </View>
            <View style={styles.scheduleInfo}>
              <Text style={styles.scheduleRoute} numberOfLines={1}>{item.origin} {"?"} {item.destination}</Text>
              <Text style={styles.scheduleBusInfo}>{item.bus_number} {"·"} {item.bus_type}</Text>
            </View>
          </View>
          <StatusBadge status={item.status} />
        </View>

        <View style={styles.scheduleDetails}>
          <View style={styles.scheduleDetailItem}>
            <Ionicons name="time-outline" size={13} color="#94a3b8" />
            <Text style={styles.scheduleDetailText}>{timeFmt(dep)} {"?"} {timeFmt(arr)}</Text>
          </View>
          <View style={styles.scheduleDetailItem}>
            <Ionicons name="cash-outline" size={13} color="#94a3b8" />
            <Text style={styles.scheduleDetailText}>Rs. {item.base_price}</Text>
          </View>
          <View style={styles.scheduleDetailItem}>
            <Ionicons name="people-outline" size={13} color="#94a3b8" />
            <Text style={styles.scheduleDetailText}>{item.available_seats}/{item.total_seats} seats</Text>
          </View>
        </View>

        <View style={styles.scheduleStaffRow}>
          <View style={styles.scheduleDetailItem}>
            <Ionicons name="person-outline" size={13} color="#94a3b8" />
            <Text style={styles.scheduleDetailText}>{item.driver_name || "No driver"}</Text>
          </View>
          <View style={styles.scheduleDetailItem}>
            <Ionicons name="people-outline" size={13} color="#94a3b8" />
            <Text style={styles.scheduleDetailText}>{item.conductor_name || "No conductor"}</Text>
          </View>
        </View>

        <View style={styles.cardActions}>
          <TouchableOpacity onPress={() => onView(item)} style={styles.actionBtnView}>
            <Ionicons name="eye-outline" size={13} color="#1e3a8a" />
            <Text style={styles.actionBtnTextView}>View</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => onEdit(item)} style={styles.actionBtnEdit}>
            <Ionicons name="pencil-outline" size={13} color="#475569" />
            <Text style={styles.actionBtnTextEdit}>Edit</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => onDelete(item.id, item.origin+"?"+item.destination)} style={styles.actionBtnDelete}>
            <Ionicons name="trash-outline" size={13} color="#ef4444" />
            <Text style={styles.actionBtnTextDelete}>Delete</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Animated.View>
  );
});
const DateTimePicker = ({ label, value, onChange, minDate }) => {
  const [showCalendar, setShowCalendar] = useState(false);
  const dateStr = value?.split(' ')[0] || '';
  const timeStr = value?.split(' ')[1] || '';

  const handleDateSelect = (day) => {
    const newDate = day.dateString;
    const combined = newDate + (timeStr ? ' ' + timeStr : '');
    onChange(combined);
    setShowCalendar(false);
  };

  const handleTimeChange = (t) => {
    let cleanTime = t.replace(/[^0-9:]/g, '');
    if (cleanTime.length === 4 && !cleanTime.includes(':')) {
      cleanTime = cleanTime.slice(0,2) + ':' + cleanTime.slice(2);
    }
    const combined = dateStr + (cleanTime ? ' ' + cleanTime : '');
    onChange(combined);
  };

  const marked = dateStr ? { [dateStr]: { selected: true, selectedColor: '#1e3a8a' } } : {};

  return (
    <>
      <TouchableOpacity onPress={() => setShowCalendar(true)} style={styles.datePickerBtn}>
        <Text style={styles.datePickerText}>{dateStr ? dateStr : "Select " + label + " date"}</Text>
        <Ionicons name="calendar-outline" size={18} color="#64748b" />
      </TouchableOpacity>

      <Field label={label + ' time (HH:MM)'} value={timeStr}
        onChangeText={handleTimeChange} keyboardType="numbers-and-punctuation" placeholder="e.g. 14:30" />

      <Portal>
        <Modal visible={showCalendar} onDismiss={() => setShowCalendar(false)}
          contentContainerStyle={{ backgroundColor: "#fff", margin: 20, borderRadius: 20, padding: 16 }}>
          <Calendar onDayPress={handleDateSelect} markedDates={marked} minDate={minDate}
            theme={{ selectedDayBackgroundColor: '#1e3a8a', arrowColor: '#1e3a8a', todayTextColor: '#1e3a8a' }} />
        </Modal>
      </Portal>
    </>
  );
};
const ScheduleForm = ({ visible, editingSchedule, form, setForm, saving, onSave, onClose, buses, routes }) => {
  const busOptions = buses.map(b => ({ label: b.bus_number + " (" + b.bus_type + ")", value: b.id.toString() }));
  const routeOptions = routes.map(r => ({ label: r.origin + " " + r.destination, value: r.id.toString() }));

  return (
    <Portal>
      <Modal visible={visible} onDismiss={onClose} contentContainerStyle={styles.modalContent}>
        <KeyboardAvoidingView style={styles.flex1} behavior={Platform.OS === "ios" ? "padding" : "height"}>
          <View style={styles.flex1}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalTitle}>{editingSchedule ? "Edit Schedule" : "New Schedule"}</Text>
                <Text style={styles.modalSubtitle}>{editingSchedule ? "Updating " + editingSchedule.origin + " " + editingSchedule.destination : "Add a trip schedule"}</Text>
              </View>
              <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
                <Ionicons name="close" size={17} color="#64748b" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.flex1} contentContainerStyle={{ paddingBottom: 30, paddingHorizontal: 20 }} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
              <SectionLabel>Bus & Route</SectionLabel>
              <Dropdown label="Bus" value={form.bus_id} options={busOptions} onSelect={(v) => setForm({ ...form, bus_id: v })} />
              <Dropdown label="Route" value={form.route_id} options={routeOptions} onSelect={(v) => setForm({ ...form, route_id: v })} />

              <SectionLabel>Schedule Time</SectionLabel>
              <DateTimePicker label="Departure" value={form.departure_time} onChange={(v) => setForm({ ...form, departure_time: v })} />
              <DateTimePicker label="Arrival" value={form.arrival_time} onChange={(v) => setForm({ ...form, arrival_time: v })} minDate={form.departure_time?.split(' ')[0]} />

              <SectionLabel>Pricing & Capacity</SectionLabel>
              <View style={styles.formRow}>
                <View style={styles.formRowItem}><Field label="Base Price" value={form.base_price} onChangeText={(t) => setForm({ ...form, base_price: t })} keyboardType="numeric" /></View>
                <View style={styles.formRowItem}><Field label="Total Seats" value={form.total_seats} onChangeText={(t) => setForm({ ...form, total_seats: t })} keyboardType="numeric" /></View>
              </View>
              <Field label="Available Seats" value={form.available_seats} onChangeText={(t) => setForm({ ...form, available_seats: t })} keyboardType="numeric" />

              <SectionLabel>Status</SectionLabel>
              <PillRow options={SCHEDULE_STATUSES} value={form.status} onChange={(v) => setForm({ ...form, status: v })} />
              {form.status === "delayed" && (
                <Field label="Delay (minutes)" value={form.delay_minutes} onChangeText={(t) => setForm({ ...form, delay_minutes: t })} keyboardType="numeric" />
              )}

              <SectionLabel>Staff</SectionLabel>
              <View style={styles.formRow}>
                <View style={styles.formRowItem}><Field label="Driver Name" value={form.driver_name} onChangeText={(t) => setForm({ ...form, driver_name: t })} /></View>
                <View style={styles.formRowItem}><Field label="Driver Phone" value={form.driver_phone} onChangeText={(t) => setForm({ ...form, driver_phone: t })} keyboardType="phone-pad" /></View>
              </View>
              <View style={styles.formRow}>
                <View style={styles.formRowItem}><Field label="Conductor Name" value={form.conductor_name} onChangeText={(t) => setForm({ ...form, conductor_name: t })} /></View>
                <View style={styles.formRowItem}><Field label="Conductor Phone" value={form.conductor_phone} onChangeText={(t) => setForm({ ...form, conductor_phone: t })} keyboardType="phone-pad" /></View>
              </View>

              <SectionLabel>Notes</SectionLabel>
              <Field label="Additional notes" value={form.notes} onChangeText={(t) => setForm({ ...form, notes: t })} multiline numberOfLines={3} />

              <View style={styles.formActions}>
                <TouchableOpacity onPress={onClose} style={styles.cancelBtn}><Text style={styles.cancelBtnText}>Cancel</Text></TouchableOpacity>
                <TouchableOpacity onPress={onSave} disabled={saving} style={styles.saveBtn}>
                  {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.saveBtnText}>{editingSchedule ? "UPDATE SCHEDULE" : "CREATE SCHEDULE"}</Text>}
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </Portal>
  );
};
const ViewScheduleModal = ({ visible, schedule, onClose }) => {
  if (!schedule) return null;
  const dep = new Date(schedule.departure_time);
  const arr = new Date(schedule.arrival_time);
  const fmt = (d) => d.toLocaleDateString() + " " + d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  return (
    <Portal>
      <Modal visible={visible} onDismiss={onClose} contentContainerStyle={styles.modalContent}>
        <View style={styles.flex1}>
          <View style={styles.modalHeader}>
            <View>
              <Text style={styles.modalTitle}>Schedule Detail</Text>
              <Text style={styles.modalSubtitle}>{schedule.origin} {"?"} {schedule.destination}</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Ionicons name="close" size={17} color="#64748b" />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.flex1} contentContainerStyle={{ paddingBottom: 30, paddingHorizontal: 20 }} showsVerticalScrollIndicator={false}>
            <SectionLabel>Bus & Route</SectionLabel>
            <View style={styles.viewField}><Text style={styles.viewFieldValue}>{schedule.bus_number} ({schedule.bus_type})</Text></View>
            <View style={styles.viewField}><Text style={styles.viewFieldValue}>{schedule.origin} {"?"} {schedule.destination}</Text></View>

            <SectionLabel>Timing</SectionLabel>
            <View style={styles.viewField}><Text style={styles.viewFieldValue}>Departure: {fmt(dep)}</Text></View>
            <View style={styles.viewField}><Text style={styles.viewFieldValue}>Arrival: {fmt(arr)}</Text></View>

            <SectionLabel>Pricing & Capacity</SectionLabel>
            <View style={styles.viewField}><Text style={styles.viewFieldValue}>Price: Rs. {schedule.base_price}</Text></View>
            <View style={styles.viewField}><Text style={styles.viewFieldValue}>Seats: {schedule.available_seats}/{schedule.total_seats}</Text></View>

            <SectionLabel>Status</SectionLabel>
            <View style={styles.viewField}><Text style={styles.viewFieldValue}>{schedule.status}</Text></View>
            {schedule.delay_minutes > 0 && <View style={styles.viewField}><Text style={[styles.viewFieldValue, { color: '#DC2626' }]}>Delay: {schedule.delay_minutes} min</Text></View>}

            <SectionLabel>Staff</SectionLabel>
            <View style={styles.viewField}><Text style={styles.viewFieldValue}>Driver: {schedule.driver_name || "—"}</Text></View>
            <View style={styles.viewField}><Text style={styles.viewFieldValue}>Conductor: {schedule.conductor_name || "—"}</Text></View>

            {schedule.notes && (<><SectionLabel>Notes</SectionLabel><View style={styles.viewField}><Text style={styles.viewFieldValue}>{schedule.notes}</Text></View></>)}
            <View style={styles.formActions}>
              <TouchableOpacity onPress={onClose} style={styles.cancelBtn}><Text style={styles.cancelBtnText}>Close</Text></TouchableOpacity>
            </View>
          </ScrollView>
        </View>
      </Modal>
    </Portal>
  );
};

export default function AdminSchedules() {
  const { schedules, loading: loadingStates, refreshing: refreshingStates,
    getPagination, updatePagination, getSearchQuery, updateSearchQuery,
    fetchSchedules, buses, routes } = useAdminData();

  const loading = loadingStates.schedules;
  const refreshing = refreshingStates.schedules;
  const { page, limit, total: totalItems } = getPagination("schedules");
  const searchQuery = getSearchQuery("schedules");

  const [searchInput, setSearchInput] = useState(searchQuery);
  const [modalVisible, setModalVisible] = useState(false);
  const [exportModalVisible, setExportModalVisible] = useState(false);
  const [viewModalVisible, setViewModalVisible] = useState(false);
  const [editingSchedule, setEditingSchedule] = useState(null);
  const [viewingSchedule, setViewingSchedule] = useState(null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [form, setForm] = useState({ ...EMPTY_FORM });
  const debounceRef = useRef(null);

  useEffect(() => { fetchSchedules(); }, [page, limit, searchQuery]);

  const commitSearch = useCallback((text) => updateSearchQuery("schedules", text), [updateSearchQuery]);

  const handleSearch = (text) => {
    setSearchInput(text);
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => commitSearch(text), 500);
  };

  const openCreate = () => { setEditingSchedule(null); setForm({ ...EMPTY_FORM }); setModalVisible(true); };
  const openEdit = (item) => { setEditingSchedule(item); setForm(itemToForm(item)); setModalVisible(true); };
  const openView = (item) => { setViewingSchedule(item); setViewModalVisible(true); };

  const handleSave = async () => {
    if (!form.bus_id || !form.route_id || !form.departure_time || !form.arrival_time) {
      return Alert.alert("Required", "Bus, Route, Departure and Arrival are required.");
    }
    setSaving(true);
    try {
      editingSchedule ? await updateSchedule(editingSchedule.id, toPayload(form)) : await createSchedule(toPayload(form));
      setModalVisible(false);
      fetchSchedules(true);
    } catch (e) {
      Alert.alert("Error", "Could not save schedule. Please try again.");
    } finally { setSaving(false); }
  };

  const handleDelete = (id, name) => {
    Alert.alert("Remove Schedule", 'Delete schedule "' + name + '"?', [
      { text: "Cancel", style: "cancel" },
      { text: "Delete", style: "destructive", onPress: async () => {
        setDeleting(true);
        try { await deleteSchedule(id); fetchSchedules(true); }
        catch (e) { Alert.alert("Error", "Could not delete. Please try again."); }
        finally { setDeleting(false); }
      }},
    ]);
  };

  const handleExport = async (type) => {
    setExportModalVisible(false);
    setExporting(true);
    try {
      if (type === "csv") await exportCSV(schedules);
      if (type === "pdf") await exportPDF(schedules);
    } catch (e) { Alert.alert("Export Failed", e.message || "Something went wrong."); }
    finally { setExporting(false); }
  };

  const totalPages = Math.ceil(totalItems / limit) || 1;
  return (
    <SafeAreaView style={styles.screen}>
      <StatusBar barStyle="light-content" backgroundColor="#1e3a8a" />

      <View style={styles.header}>
        <View style={styles.headerRow}>
          <View>
            <Text style={styles.headerTitle}>Schedule Manager</Text>
            <Text style={styles.headerCount}>{totalItems} schedule{totalItems !== 1 ? "s" : ""} found</Text>
          </View>
          <View style={styles.headerActions}>
            <TouchableOpacity onPress={() => setExportModalVisible(true)}
              disabled={exporting || schedules.length === 0} style={styles.exportBtn}>
              {exporting ? <ActivityIndicator size="small" color="#fff" /> : <Ionicons name="share-outline" size={20} color="#fff" />}
            </TouchableOpacity>
            <TouchableOpacity onPress={openCreate} style={styles.addBtn}>
              <Ionicons name="add-circle" size={17} color="#1e3a8a" />
              <Text style={styles.addBtnText}>ADD SCHEDULE</Text>
            </TouchableOpacity>
          </View>
        </View>

        <Searchbar placeholder="Search by bus, route or status..." onChangeText={handleSearch}
          value={searchInput} elevation={0}
          style={styles.searchbar} inputStyle={styles.searchbarInput}
          placeholderTextColor="rgba(255,255,255,0.4)" iconColor="rgba(255,255,255,0.6)" />
      </View>

      {loading && !refreshing ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator color="#1e3a8a" size="large" />
          <Text style={styles.loadingText}>Loading schedules...</Text>
        </View>
      ) : (
        <FlatList style={styles.flex1} data={schedules}
          keyExtractor={(item) => item.id?.toString()}
          renderItem={({ item, index }) => (
            <ScheduleCard item={item} index={index} onEdit={openEdit} onDelete={handleDelete} onView={openView} />
          )}
          contentContainerStyle={{ flexGrow: 1, paddingTop: 14, paddingBottom: 24 }}
          showsVerticalScrollIndicator={false} nestedScrollEnabled={true} keyboardShouldPersistTaps="handled"
          ListHeaderComponent={
            <View style={styles.statsBar}>
              {[{ label: "Total", val: totalItems },
                { label: "Scheduled", val: schedules.filter(s => s.status === "scheduled").length },
                { label: "Completed", val: schedules.filter(s => s.status === "completed").length },
                { label: "Cancelled", val: schedules.filter(s => s.status === "cancelled").length },
              ].map(({ label, val }, i, arr) => (
                <View key={label} style={[styles.statBox, i < arr.length - 1 && styles.statBoxBorder]}>
                  <Text style={styles.statValue}>{val}</Text>
                  <Text style={styles.statLabel}>{label}</Text>
                </View>
              ))}
            </View>
          }
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => fetchSchedules(true)} tintColor="#1e3a8a" colors={["#1e3a8a"]} />}
          ListEmptyComponent={() => (
            <View style={styles.emptyContainer}>
              <MaterialCommunityIcons name="calendar-remove-outline" size={72} color="#e2e8f0" />
              <Text style={styles.emptyText}>{searchQuery ? 'No results for "' + searchQuery + '"' : "No schedules found"}</Text>
              {!searchQuery && (
                <TouchableOpacity onPress={openCreate} style={styles.emptyAddBtn}>
                  <Ionicons name="add" size={16} color="#fff" />
                  <Text style={styles.emptyAddBtnText}>Add First Schedule</Text>
                </TouchableOpacity>
              )}
            </View>
          )}
          ListFooterComponent={() => schedules.length > 0 ? (
            <View style={styles.footerContainer}>
              <View style={styles.footer}>
                <Text style={styles.footerText}>Page {page} / {totalPages} {schedules.length} of {totalItems}</Text>
                <View style={styles.pagination}>
                  <TouchableOpacity disabled={page <= 1}
                    onPress={() => updatePagination("schedules", { page: page - 1 })}
                    style={[styles.paginationBtn, page <= 1 ? styles.paginationBtnDisabled : styles.paginationBtnActive]}>
                    <Text style={[styles.paginationText, page <= 1 ? styles.paginationTextDisabled : styles.paginationTextActive]}>Prev</Text>
                  </TouchableOpacity>
                  <TouchableOpacity disabled={page >= totalPages}
                    onPress={() => updatePagination("schedules", { page: page + 1 })}
                    style={[styles.paginationBtn, page >= totalPages ? styles.paginationBtnDisabled : styles.paginationBtnActive]}>
                    <Text style={[styles.paginationText, page >= totalPages ? styles.paginationTextDisabled : styles.paginationTextActive]}>Next</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          ) : null}
        />
      )}

      <ScheduleForm visible={modalVisible} editingSchedule={editingSchedule} form={form}
        setForm={setForm} saving={saving} onSave={handleSave}
        onClose={() => setModalVisible(false)} buses={buses} routes={routes} />

      <ViewScheduleModal visible={viewModalVisible} schedule={viewingSchedule}
        onClose={() => setViewModalVisible(false)} />

      <Portal>
        <Modal visible={exportModalVisible} onDismiss={() => setExportModalVisible(false)}
          contentContainerStyle={styles.exportModal}>
          <Text style={styles.exportModalTitle}>Export Schedule Data</Text>
          {[{ key: "csv", icon: "grid-outline", label: "Export CSV" },
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
    </SafeAreaView>
  );
}
const styles = StyleSheet.create({
  flex1: { flex: 1 },
  screen: { flex: 1, backgroundColor: '#F8FAFC' },
  sectionLabel: { color: '#1E3A8A', fontSize: 10, fontWeight: '900', textTransform: 'uppercase', letterSpacing: 2, marginTop: 20, marginBottom: 8 },
  dropdownAnchor: { backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 14, paddingHorizontal: 16, paddingVertical: 12, marginBottom: 12 },
  dropdownAnchorText: { fontSize: 12, fontWeight: '700', color: '#64748B' },
  pillRowContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 8 },
  pill: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 9999, borderWidth: 1 },
  pillInactive: { backgroundColor: '#F1F5F9', borderColor: '#E2E8F0' },
  pillText: { fontSize: 10, fontWeight: '800' },
  pillTextActive: { color: '#FFFFFF' },
  pillTextInactive: { color: '#64748B' },
  statusBadgeContainer: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12 },
  statusDot: { width: 6, height: 6, borderRadius: 3 },
  statusLabel: { fontSize: 9, fontWeight: '900' },
  scheduleCard: { backgroundColor: '#FFFFFF', marginHorizontal: 12, marginBottom: 12, borderRadius: 16, padding: 16, borderWidth: 1, borderColor: '#F1F5F9', shadowColor: '#1e3a8a', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 2 },
  scheduleCardHeader: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 12 },
  scheduleCardLeft: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 },
  scheduleIconBox: { backgroundColor: '#EFF6FF', padding: 10, borderRadius: 14 },
  scheduleInfo: { flex: 1 },
  scheduleRoute: { fontSize: 14, fontWeight: '900', color: '#0F172A' },
  scheduleBusInfo: { fontSize: 10, fontWeight: '700', color: '#64748B' },
  scheduleDetails: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, paddingTop: 12, marginBottom: 12, borderTopWidth: 1, borderTopColor: '#F8FAFC' },
  scheduleStaffRow: { flexDirection: 'row', gap: 12, marginBottom: 12 },
  scheduleDetailItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  scheduleDetailText: { fontSize: 10, fontWeight: '700', color: '#475569' },
  cardActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 8 },
  actionBtnView: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#EFF6FF', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 14 },
  actionBtnTextView: { fontSize: 10, fontWeight: '800', color: '#1D4ED8' },
  actionBtnEdit: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#F1F5F9', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 14 },
  actionBtnTextEdit: { fontSize: 10, fontWeight: '800', color: '#475569' },
  actionBtnDelete: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#FEF2F2', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 14 },
  actionBtnTextDelete: { fontSize: 10, fontWeight: '800', color: '#EF4444' },
  modalContent: { backgroundColor: '#fff', margin: 14, borderRadius: 24, maxHeight: '92%' },
  modalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 20, paddingBottom: 16, borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
  modalTitle: { fontSize: 16, fontWeight: '900', color: '#0F172A' },
  modalSubtitle: { fontSize: 10, color: '#94A3B8', marginTop: 2 },
  closeBtn: { width: 36, height: 36, backgroundColor: '#F1F5F9', borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  datePickerBtn: { backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 14, paddingHorizontal: 16, paddingVertical: 12, marginBottom: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  datePickerText: { fontSize: 12, fontWeight: '700', color: '#64748B' },
  formRow: { flexDirection: 'row', gap: 8 },
  formRowItem: { flex: 1 },
  formActions: { flexDirection: 'row', gap: 12, marginTop: 16, marginBottom: 40 },
  cancelBtn: { flex: 1, paddingVertical: 16, borderRadius: 16, alignItems: 'center', backgroundColor: '#F1F5F9', borderWidth: 1, borderColor: '#E2E8F0' },
  cancelBtnText: { fontWeight: '800', color: '#64748B', fontSize: 12 },
  saveBtn: { flex: 2, paddingVertical: 16, borderRadius: 16, alignItems: 'center', backgroundColor: '#1E3A8A', shadowColor: '#1e3a8a', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 5 },
  saveBtnText: { fontWeight: '900', color: '#FFFFFF', fontSize: 12 },
  viewField: { marginBottom: 12 },
  viewFieldValue: { fontSize: 12, fontWeight: '600', color: '#0F172A' },
  header: { backgroundColor: '#1E3A8A', paddingHorizontal: 16, paddingTop: 16, paddingBottom: 16 },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  headerTitle: { fontSize: 18, fontWeight: '900', color: '#FFFFFF', letterSpacing: -0.5 },
  headerCount: { fontSize: 10, color: '#93C5FD', fontWeight: '600', marginTop: 2 },
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  exportBtn: { width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.15)' },
  addBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#FFFFFF', paddingHorizontal: 16, height: 44, borderRadius: 14 },
  addBtnText: { fontWeight: '900', color: '#1E3A8A', fontSize: 10 },
  searchbar: { backgroundColor: 'rgba(255,255,255,0.12)', borderRadius: 14, height: 46 },
  searchbarInput: { fontSize: 13, fontWeight: '600', color: '#fff' },
  loadingContainer: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  loadingText: { marginTop: 12, color: '#94A3B8', fontWeight: '700', fontSize: 12 },
  statsBar: { backgroundColor: '#FFFFFF', flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
  statBox: { flex: 1, alignItems: 'center', paddingVertical: 12 },
  statBoxBorder: { borderRightWidth: 1, borderRightColor: '#F1F5F9' },
  statValue: { fontSize: 18, fontWeight: '900', color: '#1E3A8A' },
  statLabel: { fontSize: 9, color: '#94A3B8', fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1, marginTop: 2 },
  emptyContainer: { alignItems: 'center', paddingTop: 96, paddingHorizontal: 40 },
  emptyText: { marginTop: 16, color: '#94A3B8', fontWeight: '800', fontSize: 14, textAlign: 'center' },
  emptyAddBtn: { marginTop: 20, flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#1E3A8A', paddingHorizontal: 24, paddingVertical: 12, borderRadius: 16 },
  emptyAddBtnText: { color: '#FFFFFF', fontWeight: '900', fontSize: 12 },
  footerContainer: { marginHorizontal: 12, marginTop: 4, marginBottom: 24 },
  footer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#FFFFFF', borderRadius: 16, paddingHorizontal: 16, paddingVertical: 12, borderWidth: 1, borderColor: '#F1F5F9' },
  footerText: { fontSize: 10, color: '#94A3B8', fontWeight: '700' },
  pagination: { flexDirection: 'row', gap: 8 },
  paginationBtn: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 14, borderWidth: 1 },
  paginationBtnDisabled: { backgroundColor: '#F8FAFC', borderColor: '#E2E8F0' },
  paginationBtnActive: { backgroundColor: '#1E3A8A', borderColor: '#1E3A8A' },
  paginationText: { fontSize: 10, fontWeight: '800' },
  paginationTextDisabled: { color: '#CBD5E1' },
  paginationTextActive: { color: '#FFFFFF' },
  exportModal: { backgroundColor: 'white', marginHorizontal: 40, borderRadius: 16, padding: 16 },
  exportModalTitle: { fontSize: 14, fontWeight: '900', color: '#1E293B', marginBottom: 12 },
  exportOption: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
  exportOptionText: { fontSize: 12, fontWeight: '700', color: '#1E293B' },
  exportCancel: { marginTop: 8, alignItems: 'center', paddingVertical: 8 },
  exportCancelText: { fontSize: 10, fontWeight: '700', color: '#94A3B8' },
});
