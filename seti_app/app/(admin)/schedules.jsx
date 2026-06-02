import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  View, Text, SafeAreaView, ScrollView, TouchableOpacity,
  ActivityIndicator, Alert, RefreshControl,
  KeyboardAvoidingView, Platform, StatusBar, StyleSheet,
} from "react-native";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { Portal, Modal, TextInput, Searchbar } from "react-native-paper";
import { Calendar } from "react-native-calendars";
import * as Print from "expo-print";
import * as Sharing from "expo-sharing";
import * as FileSystem from "expo-file-system";
import Animated, { FadeInDown } from "react-native-reanimated";
import { createSchedule, deleteSchedule, updateSchedule, getScheduleById, getAllSchedulesForExport } from "../../api/schedules";
import { useAdminData } from "../../context/AdminContext";
import PdfViewer from "../../components/PdfViewer";

const SCHEDULE_STATUSES = ["scheduled", "active", "completed", "cancelled", "delayed"];
const PAGE_SIZES = [10, 25, 50, 100];

const normalizeStatus = (status) => status ?? "scheduled";
const normalizeSchedule = (item) => ({ ...item, status: normalizeStatus(item.status) });

const STATUS_CFG = {
  scheduled: { dot: { backgroundColor: "#3B82F6" }, badge: { backgroundColor: "#DBEAFE" }, text: { color: "#1D4ED8" }, label: "SCHEDULED" },
  active:    { dot: { backgroundColor: "#22C55E" }, badge: { backgroundColor: "#DCFCE7" }, text: { color: "#15803D" }, label: "ACTIVE" },
  completed: { dot: { backgroundColor: "#6B7280" }, badge: { backgroundColor: "#F3F4F6" }, text: { color: "#4B5563" }, label: "COMPLETED" },
  cancelled: { dot: { backgroundColor: "#EF4444" }, badge: { backgroundColor: "#FEE2E2" }, text: { color: "#B91C1C" }, label: "CANCELLED" },
  delayed:   { dot: { backgroundColor: "#EAB308" }, badge: { backgroundColor: "#FEF9C3" }, text: { color: "#A16207" }, label: "DELAYED" },
};

const EMPTY_FORM = {
  bus_id: "", route_id: "",
  departure_time: "", arrival_time: "",
  base_price: "", available_seats: "", total_seats: "",
  status: "scheduled", delay_minutes: "0",
  driver_name: "", driver_phone: "", conductor_name: "", conductor_phone: "",
  boarding_point: "", notes: "",
};

const COLUMNS = [
  { key: "id", label: "ID", sortable: true, flex: 0.6 },
  { key: "bus_number", label: "Bus", sortable: true, flex: 0.9 },
  { key: "route_name", label: "Route", sortable: false, flex: 1.2 },
  { key: "driver_name", label: "Driver", sortable: true, flex: 1 },
  { key: "departure_time", label: "Departure", sortable: true, flex: 1.1 },
  { key: "arrival_time", label: "Arrival", sortable: true, flex: 1.1 },
  { key: "available_seats", label: "Seats", sortable: true, flex: 0.6 },
  { key: "base_price", label: "Fare", sortable: true, flex: 0.6 },
  { key: "status", label: "Status", sortable: true, flex: 0.8 },
  { key: "created_at", label: "Created", sortable: true, flex: 0.8 },
  { key: "actions", label: "Actions", sortable: false, flex: 1.2 },
];

const fmtDateTime = (dt) => {
  if (!dt) return "";
  const d = new Date(dt);
  if (isNaN(d.getTime())) return "";
  const pad = (n) => String(n).padStart(2, "0");
  return d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate()) + " " + pad(d.getHours()) + ":" + pad(d.getMinutes());
};

const formatDate = (d) => {
  if (!d) return "—";
  const dt = new Date(d);
  if (isNaN(dt.getTime())) return "—";
  return dt.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
};

const formatDateTime = (d) => {
  if (!d) return "—";
  const dt = new Date(d);
  if (isNaN(dt.getTime())) return "—";
  return dt.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) + " " +
    dt.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });
};

const itemToForm = (item) => ({
  bus_id: String(item.bus_id ?? ""),
  route_id: String(item.route_id ?? ""),
  departure_time: fmtDateTime(item.departure_time),
  arrival_time: fmtDateTime(item.arrival_time),
  base_price: String(item.base_price ?? ""),
  available_seats: String(item.available_seats ?? item.total_seats ?? ""),
  total_seats: String(item.total_seats ?? ""),
  status: normalizeStatus(item.status),
  delay_minutes: String(item.delay_minutes ?? 0),
  driver_name: item.driver_name ?? "",
  driver_phone: item.driver_phone ?? "",
  conductor_name: item.conductor_name ?? "",
  conductor_phone: item.conductor_phone ?? "",
  boarding_point: item.boarding_point ?? "",
  notes: item.notes ?? "",
});

const toPayload = (f) => {
  const parseDate = (str) => {
    if (!str) return null;
    try { return new Date(str).toISOString(); } catch { return null; }
  };
  return {
    bus_id: parseInt(f.bus_id) || null,
    route_id: parseInt(f.route_id) || null,
    departure_time: parseDate(f.departure_time),
    arrival_time: parseDate(f.arrival_time),
    base_price: parseFloat(f.base_price) || 0,
    total_seats: parseInt(f.total_seats) || 0,
    available_seats: parseInt(f.available_seats) || 0,
    status: f.status,
    delay_minutes: parseInt(f.delay_minutes) || 0,
    driver_name: f.driver_name || null,
    driver_phone: f.driver_phone || null,
    conductor_name: f.conductor_name || null,
    conductor_phone: f.conductor_phone || null,
    notes: f.notes || null,
  };
};

const buildHTML = (schedules) => `<!DOCTYPE html><html><head><meta charset="utf-8"/>
<style>
  body{font-family:Arial,sans-serif;padding:28px;color:#1e293b}
  h1{color:#1e3a8a;font-size:22px;font-weight:900;margin:0}
  p{color:#64748b;font-size:12px;margin:4px 0 24px}
  table{width:100%;border-collapse:collapse;font-size:11px}
  th{background:#1e3a8a;color:#fff;padding:8px 10px;text-align:left;font-size:9px;text-transform:uppercase}
  td{padding:7px 10px;border-bottom:1px solid #e2e8f0}
  tr:nth-child(even) td{background:#f8fafc}
  .badge{display:inline-block;padding:2px 8px;border-radius:12px;font-size:9px;font-weight:700}
  .scheduled{background:#dbeafe;color:#1e40af}
  .active{background:#dcfce7;color:#16a34a}
  .cancelled{background:#fee2e2;color:#dc2626}
  .completed{background:#f3f4f6;color:#4b5563}
  .delayed{background:#fef9c3;color:#ca8a04}
</style></head><body>
<h1>Schedule Report</h1>
<p>Generated: ${new Date().toLocaleString()} \u00B7 ${schedules.length} entries</p>
<table>
  <thead><tr>
    <th>#</th><th>Code</th><th>Bus</th><th>Route</th><th>Departure</th><th>Arrival</th>
    <th>Fare</th><th>Seats</th><th>Status</th><th>Driver</th><th>Conductor</th><th>Delay</th>
  </tr></thead>
  <tbody>
    ${schedules.map((s, i) => `<tr>
      <td>${i + 1}</td>
      <td><strong>${s.schedule_code || "SCH-" + s.id}</strong></td>
      <td>${s.bus_number || ""} (${s.bus_type || ""})</td>
      <td>${(s.origin || "") + " \u2192 " + (s.destination || "")}</td>
      <td>${formatDateTime(s.departure_time)}</td>
      <td>${formatDateTime(s.arrival_time)}</td>
      <td>Rs. ${s.base_price || 0}</td>
      <td>${s.available_seats || 0}/${s.total_seats || 0}</td>
      <td><span class="badge ${s.status}">${s.status}</span></td>
      <td>${s.driver_name || ""}</td>
      <td>${s.conductor_name || ""}</td>
      <td>${s.delay_minutes || 0} min</td>
    </tr>`).join("")}
  </tbody>
</table></body></html>`;

const buildCSV = (schedules) => {
  const H = ["ID", "Code", "Bus", "Bus Type", "Route", "Departure", "Arrival", "Fare", "Seats", "Status", "Driver", "Driver Phone", "Conductor", "Conductor Phone", "Delay", "Boarding Point", "Notes"];
  const E = (v) => `"${String(v ?? "").replace(/"/g, '""')}"`;
  const rows = schedules.map((s) => [
    s.id, s.schedule_code || "SCH-" + s.id, s.bus_number, s.bus_type,
    (s.origin || "") + " \u2192 " + (s.destination || ""),
    formatDateTime(s.departure_time), formatDateTime(s.arrival_time),
    s.base_price, (s.available_seats || 0) + "/" + (s.total_seats || 0),
    s.status, s.driver_name, s.driver_phone, s.conductor_name, s.conductor_phone,
    s.delay_minutes, s.boarding_point, s.notes,
  ].map(E).join(","));
  return [H.map(E).join(","), ...rows].join("\r\n");
};

const buildXLS = (schedules) => {
  const headers = ["ID", "Code", "Bus", "Bus Type", "Route", "Departure", "Arrival", "Fare", "Seats", "Status", "Driver", "Driver Phone", "Conductor", "Conductor Phone", "Delay", "Boarding Point", "Notes"];
  const rows = schedules.map((s) => [
    s.id, s.schedule_code || "SCH-" + s.id, s.bus_number, s.bus_type || "",
    (s.origin || "") + " \u2192 " + (s.destination || ""),
    formatDateTime(s.departure_time), formatDateTime(s.arrival_time),
    s.base_price, (s.available_seats || 0) + "/" + (s.total_seats || 0),
    s.status, s.driver_name || "", s.driver_phone || "",
    s.conductor_name || "", s.conductor_phone || "",
    s.delay_minutes || 0, s.boarding_point || "", s.notes || "",
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
 <Worksheet ss:Name="Schedules">
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
    try {
      const contentUri = await FileSystem.getContentUriAsync(path);
      uri = contentUri.uri;
    } catch { uri = path; }
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

const exportCSV = async (schedules) => {
  const csv = buildCSV(schedules);
  if (Platform.OS === "web") {
    downloadBlob(new Blob([csv], { type: "text/csv;charset=utf-8;" }), `schedules_${Date.now()}.csv`);
    return;
  }
  const path = `${FileSystem.cacheDirectory}schedules_${Date.now()}.csv`;
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
        anchor.href = uri;
        anchor.download = `schedules_${Date.now()}.pdf`;
        document.body.appendChild(anchor);
        anchor.click();
        anchor.remove();
        return;
      }
    } catch { /* fallback */ }
    await Print.printAsync({ html });
    return;
  }
  const { uri } = await Print.printToFileAsync({ html });
  await shareFile(uri, "application/pdf", "Export PDF");
};

const exportXLS = async (schedules) => {
  const xls = buildXLS(schedules);
  if (Platform.OS === "web") {
    downloadBlob(new Blob([xls], { type: "application/vnd.ms-excel;charset=utf-8" }), `schedules_${Date.now()}.xls`);
    return;
  }
  const path = `${FileSystem.cacheDirectory}schedules_${Date.now()}.xls`;
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

const Dropdown = ({ label, value, options, onSelect, displayKey = "label", valueKey = "value", error }) => {
  const [visible, setVisible] = useState(false);
  const selected = options.find(o => o[valueKey] == value);
  return (
    <View style={{ marginBottom: 12 }}>
      <TouchableOpacity onPress={() => setVisible(true)}
        style={[styles.dropdownAnchor, error ? { borderColor: "#ef4444" } : undefined]}>
        <Text style={[styles.dropdownAnchorText, !selected && { color: "#94A3B8" }]}>
          {selected ? selected[displayKey] : `Select ${label}`}
        </Text>
        <Ionicons name="chevron-down" size={16} color="#64748b" />
      </TouchableOpacity>
      {error ? <Text style={styles.fieldError}>{error}</Text> : null}
      <Portal>
        <Modal visible={visible} onDismiss={() => setVisible(false)}
          contentContainerStyle={styles.dropdownModal}>
          <ScrollView style={{ maxHeight: 300 }}>
            {options.map((opt) => (
              <TouchableOpacity key={opt[valueKey]} onPress={() => { onSelect(opt[valueKey]); setVisible(false); }}
                style={[styles.dropdownItem, value == opt[valueKey] && styles.dropdownItemActive]}>
                <Text style={[styles.dropdownItemText, value == opt[valueKey] && styles.dropdownItemTextActive]}>
                  {opt[displayKey]}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </Modal>
      </Portal>
    </View>
  );
};

const DateTimePicker = ({ label, value, onChange, minDate, error }) => {
  const [showCalendar, setShowCalendar] = useState(false);
  const dateStr = value?.split(" ")[0] || "";
  const timeStr = value?.split(" ")[1] || "";
  const marked = dateStr ? { [dateStr]: { selected: true, selectedColor: "#1e3a8a" } } : {};

  const handleDateSelect = (day) => {
    const combined = day.dateString + (timeStr ? " " + timeStr : "");
    onChange(combined);
    setShowCalendar(false);
  };

  const handleTimeChange = (t) => {
    let cleanTime = t.replace(/[^0-9:]/g, "");
    if (cleanTime.length === 4 && !cleanTime.includes(":"))
      cleanTime = cleanTime.slice(0, 2) + ":" + cleanTime.slice(2);
    onChange(dateStr + (cleanTime ? " " + cleanTime : ""));
  };

  return (
    <View style={{ marginBottom: 12 }}>
      <TouchableOpacity onPress={() => setShowCalendar(true)}
        style={[styles.datePickerBtn, error ? { borderColor: "#ef4444" } : undefined]}>
        <Text style={[styles.datePickerText, !dateStr && { color: "#94A3B8" }]}>
          {dateStr || `Select ${label} date`}
        </Text>
        <Ionicons name="calendar-outline" size={18} color={error ? "#ef4444" : "#64748b"} />
      </TouchableOpacity>
      <TextInput
        mode="outlined"
        label={`${label} time (HH:MM)`}
        value={timeStr}
        onChangeText={handleTimeChange}
        keyboardType="numbers-and-punctuation"
        placeholder="e.g. 14:30"
        error={!!error}
        textColor="#0f172a"
        style={{ backgroundColor: "#fff" }}
      />
      <Portal>
        <Modal visible={showCalendar} onDismiss={() => setShowCalendar(false)}
          contentContainerStyle={{ backgroundColor: "#fff", margin: 20, borderRadius: 20, padding: 16 }}>
          <Calendar onDayPress={handleDateSelect} markedDates={marked} minDate={minDate}
            theme={{ selectedDayBackgroundColor: "#1e3a8a", arrowColor: "#1e3a8a", todayTextColor: "#1e3a8a" }} />
        </Modal>
      </Portal>
    </View>
  );
};

const PillRow = ({ options, value, onChange }) => {
  const activeBgMap = {
    scheduled: { backgroundColor: "#3B82F6", borderColor: "#3B82F6" },
    active:    { backgroundColor: "#16A34A", borderColor: "#16A34A" },
    completed: { backgroundColor: "#6B7280", borderColor: "#6B7280" },
    cancelled: { backgroundColor: "#DC2626", borderColor: "#DC2626" },
    delayed:   { backgroundColor: "#EAB308", borderColor: "#EAB308" },
  };
  return (
    <View style={styles.pillRowContainer}>
      {options.map((opt) => {
        const on = value === opt;
        const activeBg = activeBgMap[opt] || { backgroundColor: "#1E3A8A", borderColor: "#1E3A8A" };
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

const ScheduleForm = ({ visible, editingSchedule, form, setForm, formErrors, clearFieldError, saving, onSave, onClose, buses, routes }) => {
  const busOptions = (buses || []).map(b => ({ label: `${b.bus_number} (${b.bus_type || ""})`, value: b.id.toString() }));
  const routeOptions = (routes || []).map(r => ({ label: `${r.origin || ""} \u2192 ${r.destination || ""}`, value: r.id.toString() }));
  const clr = (f) => (v) => { if (clearFieldError) clearFieldError(f); setForm({ ...form, [f]: v }); };
  const selectedBus = buses?.find(b => b.id.toString() === form.bus_id);

  return (
    <Portal>
      <Modal visible={visible} onDismiss={onClose} contentContainerStyle={styles.modalContent}>
        <KeyboardAvoidingView style={styles.flex1} behavior={Platform.OS === "ios" ? "padding" : "height"}>
          <View style={styles.flex1}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalTitle}>{editingSchedule ? "Edit Schedule" : "New Schedule"}</Text>
                <Text style={styles.modalSubtitle}>{editingSchedule ? `Updating SCH-${editingSchedule.id}` : "Add a new trip schedule"}</Text>
              </View>
              <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
                <Ionicons name="close" size={17} color="#64748b" />
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.flex1} contentContainerStyle={{ paddingBottom: 30, paddingHorizontal: 20 }}
              showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
              <SectionLabel>Schedule Info</SectionLabel>
              <Dropdown label="Bus *" value={form.bus_id} options={busOptions} onSelect={clr("bus_id")} error={formErrors?.bus_id} />
              <Dropdown label="Route *" value={form.route_id} options={routeOptions} onSelect={clr("route_id")} error={formErrors?.route_id} />

              <SectionLabel>Schedule Time</SectionLabel>
              <DateTimePicker label="Departure" value={form.departure_time} onChange={clr("departure_time")} error={formErrors?.departure_time} />
              <DateTimePicker label="Arrival" value={form.arrival_time} onChange={clr("arrival_time")} error={formErrors?.arrival_time} minDate={form.departure_time?.split(" ")[0]} />

              <SectionLabel>Pricing &amp; Capacity</SectionLabel>
              <View style={styles.formRow}>
                <View style={styles.formRowItem}>
                  <Field label="Base Fare *" value={form.base_price} error={formErrors?.base_price} onChangeText={clr("base_price")} keyboardType="numeric" />
                </View>
                <View style={styles.formRowItem}>
                  <Field label="Total Seats *" value={form.total_seats} error={formErrors?.total_seats} onChangeText={clr("total_seats")} keyboardType="numeric" />
                </View>
              </View>
              <Field label="Available Seats" value={form.available_seats} error={formErrors?.available_seats} onChangeText={clr("available_seats")} keyboardType="numeric" />
              {selectedBus && (
                <Text style={{ fontSize: 10, color: "#64748B", fontWeight: "600", marginTop: -8, marginBottom: 12 }}>
                  Bus capacity: {selectedBus.total_seats} seats
                </Text>
              )}
              <Field label="Boarding Point" value={form.boarding_point} error={formErrors?.boarding_point} onChangeText={clr("boarding_point")} />

              <SectionLabel>Status</SectionLabel>
              <PillRow options={SCHEDULE_STATUSES} value={form.status} onChange={(v) => setForm({ ...form, status: v })} />
              {form.status === "delayed" && (
                <Field label="Delay (minutes)" value={form.delay_minutes} onChangeText={clr("delay_minutes")} keyboardType="numeric" />
              )}

              <SectionLabel>Staff</SectionLabel>
              <View style={styles.formRow}>
                <View style={styles.formRowItem}><Field label="Driver Name" value={form.driver_name} onChangeText={clr("driver_name")} /></View>
                <View style={styles.formRowItem}><Field label="Driver Phone" value={form.driver_phone} onChangeText={clr("driver_phone")} keyboardType="phone-pad" /></View>
              </View>
              <View style={styles.formRow}>
                <View style={styles.formRowItem}><Field label="Conductor Name" value={form.conductor_name} onChangeText={clr("conductor_name")} /></View>
                <View style={styles.formRowItem}><Field label="Conductor Phone" value={form.conductor_phone} onChangeText={clr("conductor_phone")} keyboardType="phone-pad" /></View>
              </View>

              <SectionLabel>Notes</SectionLabel>
              <Field label="Additional notes\u2026" value={form.notes} error={formErrors?.notes} onChangeText={clr("notes")} multiline numberOfLines={3} />

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
  const form = itemToForm(schedule);
  return (
    <Portal>
      <Modal visible={visible} onDismiss={onClose} contentContainerStyle={styles.modalContent}>
        <View style={styles.flex1}>
          <View style={styles.modalHeader}>
            <View>
              <Text style={styles.modalTitle}>Schedule Details</Text>
              <Text style={styles.modalSubtitle}>SCH-{schedule.id}</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Ionicons name="close" size={17} color="#64748b" />
            </TouchableOpacity>
          </View>
          <ScrollView style={styles.flex1} contentContainerStyle={{ paddingBottom: 30, paddingHorizontal: 20 }} showsVerticalScrollIndicator={false}>
            <SectionLabel>Schedule Info</SectionLabel>
            <View style={styles.viewField}><Text style={styles.viewFieldLabel}>Bus</Text><Text style={styles.viewFieldValue}>{schedule.bus_number} ({schedule.bus_type || ""})</Text></View>
            <View style={styles.viewField}><Text style={styles.viewFieldLabel}>Route</Text><Text style={styles.viewFieldValue}>{(schedule.origin || "") + " \u2192 " + (schedule.destination || "")}</Text></View>

            <SectionLabel>Timing</SectionLabel>
            <View style={styles.viewField}><Text style={styles.viewFieldLabel}>Departure</Text><Text style={styles.viewFieldValue}>{formatDateTime(schedule.departure_time)}</Text></View>
            <View style={styles.viewField}><Text style={styles.viewFieldLabel}>Arrival</Text><Text style={styles.viewFieldValue}>{formatDateTime(schedule.arrival_time)}</Text></View>

            <SectionLabel>Pricing &amp; Capacity</SectionLabel>
            <View style={styles.formRow}>
              <View style={styles.formRowItem}><Text style={styles.viewFieldLabel}>Fare</Text><Text style={styles.viewFieldValue}>Rs. {schedule.base_price || 0}</Text></View>
              <View style={styles.formRowItem}><Text style={styles.viewFieldLabel}>Seats</Text><Text style={styles.viewFieldValue}>{schedule.available_seats || 0}/{schedule.total_seats || 0}</Text></View>
            </View>
            <View style={styles.viewField}><Text style={styles.viewFieldLabel}>Boarding Point</Text><Text style={styles.viewFieldValue}>{schedule.boarding_point || "\u2014"}</Text></View>

            <SectionLabel>Status</SectionLabel>
            <View style={styles.viewField}><StatusBadge status={schedule.status} /></View>
            {schedule.delay_minutes > 0 && (
              <View style={styles.viewField}><Text style={[styles.viewFieldLabel, { color: "#DC2626" }]}>Delay</Text><Text style={[styles.viewFieldValue, { color: "#DC2626" }]}>{schedule.delay_minutes} minutes</Text></View>
            )}

            <SectionLabel>Staff</SectionLabel>
            <View style={styles.formRow}>
              <View style={styles.formRowItem}><Text style={styles.viewFieldLabel}>Driver</Text><Text style={styles.viewFieldValue}>{schedule.driver_name || "\u2014"}</Text></View>
              <View style={styles.formRowItem}><Text style={styles.viewFieldLabel}>Driver Phone</Text><Text style={styles.viewFieldValue}>{schedule.driver_phone || "\u2014"}</Text></View>
            </View>
            <View style={styles.formRow}>
              <View style={styles.formRowItem}><Text style={styles.viewFieldLabel}>Conductor</Text><Text style={styles.viewFieldValue}>{schedule.conductor_name || "\u2014"}</Text></View>
              <View style={styles.formRowItem}><Text style={styles.viewFieldLabel}>Conductor Phone</Text><Text style={styles.viewFieldValue}>{schedule.conductor_phone || "\u2014"}</Text></View>
            </View>

            {schedule.notes ? (
              <><SectionLabel>Notes</SectionLabel><View style={styles.viewField}><Text style={styles.viewFieldValue}>{schedule.notes}</Text></View></>
            ) : null}

            <View style={styles.formActions}>
              <TouchableOpacity onPress={onClose} style={styles.cancelBtn}><Text style={styles.cancelBtnText}>Close</Text></TouchableOpacity>
            </View>
          </ScrollView>
        </View>
      </Modal>
    </Portal>
  );
};

const PdfPreviewModal = ({ visible, uri, onClose }) => (
  <Portal>
    <Modal visible={visible} onDismiss={onClose} contentContainerStyle={styles.pdfModalContent}>
      <View style={styles.pdfModalHeader}>
        <Text style={styles.pdfModalTitle}>PDF Preview</Text>
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

export default function AdminSchedules() {
  const {
    schedules,
    loading: loadingStates,
    refreshing: refreshingStates,
    getPagination,
    updatePagination,
    getSearchQuery,
    updateSearchQuery,
    getSort,
    updateSort,
    fetchSchedules,
    buses,
    routes,
  } = useAdminData();

  const loading = loadingStates.schedules;
  const refreshing = refreshingStates.schedules;
  const { page, limit, total: totalItems } = getPagination("schedules");
  const searchQuery = getSearchQuery("schedules");
  const { sortBy, sortOrder } = getSort("schedules");

  const [searchInput, setSearchInput] = useState(searchQuery);
  const [modalVisible, setModalVisible] = useState(false);
  const [exportModalVisible, setExportModalVisible] = useState(false);
  const [viewModalVisible, setViewModalVisible] = useState(false);
  const [pdfModalVisible, setPdfModalVisible] = useState(false);
  const [pdfUri, setPdfUri] = useState(null);
  const [editingSchedule, setEditingSchedule] = useState(null);
  const [viewingSchedule, setViewingSchedule] = useState(null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [exportRange, setExportRange] = useState("page");
  const [pageSizeModalVisible, setPageSizeModalVisible] = useState(false);
  const [form, setForm] = useState({ ...EMPTY_FORM });
  const [formErrors, setFormErrors] = useState({});
  const debounceRef = useRef(null);
  const normalizedSchedules = schedules.map(normalizeSchedule);

  useEffect(() => { fetchSchedules(); }, [page, limit, searchQuery, sortBy, sortOrder]);

  const commitSearch = useCallback((text) => updateSearchQuery("schedules", text), [updateSearchQuery]);

  const handleSearch = (text) => {
    setSearchInput(text);
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => commitSearch(text), 500);
  };

  const handleSort = (column) => {
    if (!column.sortable) return;
    const currentSort = getSort("schedules");
    if (currentSort.sortBy === column.key) {
      updateSort("schedules", column.key, currentSort.sortOrder === "ASC" ? "DESC" : "ASC");
    } else {
      updateSort("schedules", column.key, "ASC");
    }
  };

  const handlePageSizeChange = (newSize) => {
    updatePagination("schedules", { limit: newSize, page: 1 });
    setPageSizeModalVisible(false);
  };

  const openCreate = () => { setEditingSchedule(null); setForm({ ...EMPTY_FORM }); setFormErrors({}); setModalVisible(true); };
  const openEdit = (item) => { setEditingSchedule(item); setForm(itemToForm(item)); setFormErrors({}); setModalVisible(true); };
  const openView = (item) => { setViewingSchedule(item); setViewModalVisible(true); };

  const validateForm = () => {
    const errors = {};
    if (!form.bus_id) errors.bus_id = "Bus is required";
    if (!form.route_id) errors.route_id = "Route is required";
    if (!form.departure_time) errors.departure_time = "Departure date/time is required";
    if (!form.arrival_time) errors.arrival_time = "Arrival date/time is required";
    if (form.departure_time && form.arrival_time) {
      const dep = new Date(form.departure_time);
      const arr = new Date(form.arrival_time);
      if (!isNaN(dep.getTime()) && !isNaN(arr.getTime()) && arr <= dep)
        errors.arrival_time = "Arrival must be after departure";
    }
    if (!form.base_price || parseFloat(form.base_price) < 0) errors.base_price = "Valid fare is required";
    if (!form.total_seats || parseInt(form.total_seats) < 1) errors.total_seats = "Valid seat count required";
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const clearFieldError = (field) => {
    if (formErrors[field]) setFormErrors((prev) => { const n = { ...prev }; delete n[field]; return n; });
  };

  const handleSave = async () => {
    if (!validateForm()) return;
    setSaving(true);
    try {
      editingSchedule ? await updateSchedule(editingSchedule.id, toPayload(form)) :
        await createSchedule(toPayload(form));
      setModalVisible(false);
      setFormErrors({});
      Alert.alert("Success", editingSchedule ? "Schedule updated successfully!" : "Schedule created successfully!", [
        { text: "OK", onPress: () => fetchSchedules(true) },
      ]);
    } catch (err) {
      const data = err.response?.data;
      const msg = data?.message || "Could not save. Please try again.";
      let fieldErrors = data?.fields;
      if (!fieldErrors && Array.isArray(data?.errors)) {
        fieldErrors = {};
        data.errors.forEach(e => {
          const m = e.match(/^"([^"]+)"/);
          if (m) fieldErrors[m[1]] = e;
        });
      }
      if (fieldErrors && typeof fieldErrors === 'object') setFormErrors(fieldErrors);
      Alert.alert("Error", msg);
    } finally {
      setSaving(false);
      await fetchSchedules(true);
    }
  };

  const handleDelete = (id, name) => {
    if(Platform.OS === "web") {
      if (window.confirm(`Delete schedule "${name}"?`)) {
        setDeleting(true);
        deleteSchedule(id).then(() => {
          Alert.alert("Success", "Schedule deleted successfully.");
        }).catch((error) => {
          const status = error.response?.status;
          const data = error.response?.data;
          const msg = data?.message || error.message || "Could not delete the schedule.";
          Alert.alert("Delete Failed", `Status: ${status || "—"}\n${msg}`);
        }).finally(() => {
          setDeleting(false);
          fetchSchedules(true);
        });
      }
    }
    if (!id) { Alert.alert("Error", "Invalid schedule ID. Cannot delete."); return; }
    Alert.alert("Remove Schedule", `Delete schedule "${name}"?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete", style: "destructive", onPress: async () => {
          setDeleting(true);
          try {
            await deleteSchedule(id);
            Alert.alert("Success", "Schedule deleted successfully.");
          } catch (error) {
            const status = error.response?.status;
            const data = error.response?.data;
            const msg = data?.message || error.message || "Could not delete the schedule.";
            Alert.alert("Delete Failed", `Status: ${status || "—"}\n${msg}`);
          } finally {
            setDeleting(false);
            await fetchSchedules(true);
          }
        }
      },
    ]);
  };

  const handleExport = async (type) => {
    setExportModalVisible(false);
    setExporting(true);
    try {
      const exportData = exportRange === "all"
        ? (await getAllSchedulesForExport()).data.data?.schedules || normalizedSchedules
        : normalizedSchedules;
      const allSchedules = exportData.map(normalizeSchedule);
      if (type === "csv") await exportCSV(allSchedules);
      if (type === "pdf") await exportPDF(allSchedules);
      if (type === "xls") await exportXLS(allSchedules);
    } catch (e) { Alert.alert("Export Failed", e.message || "Something went wrong."); }
    finally { setExporting(false); }
  };

  const totalPages = Math.ceil(totalItems / limit) || 1;
  const startEntry = totalItems === 0 ? 0 : (page - 1) * limit + 1;
  const endEntry = Math.min(page * limit, totalItems);

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
    const current = getSort("schedules");
    if (current.sortBy !== column.key) return <Ionicons name="swap-vertical-outline" size={12} color="#94a3b8" style={{ marginLeft: 3 }} />;
    return (
      <Ionicons
        name={current.sortOrder === "ASC" ? "caret-up" : "caret-down"}
        size={12}
        color="#fff"
        style={{ marginLeft: 3 }}
      />
    );
  };

  const renderRouteText = (item) => {
    const o = item.origin || "";
    const d = item.destination || "";
    return o || d ? `${o} \u2192 ${d}` : "\u2014";
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
          <Text style={styles.cellBusNumber} numberOfLines={1}>SCH-{item.id}</Text>
        </View>
        <View style={[styles.tableCell, { flex: COLUMNS[1].flex }]}>
          <Text style={styles.cellText} numberOfLines={1}>{item.bus_number || "\u2014"}</Text>
        </View>
        <View style={[styles.tableCell, { flex: COLUMNS[2].flex }]}>
          <Text style={styles.cellText} numberOfLines={1}>{renderRouteText(item)}</Text>
        </View>
        <View style={[styles.tableCell, { flex: COLUMNS[3].flex }]}>
          <Text style={styles.cellText} numberOfLines={1}>{item.driver_name || "\u2014"}</Text>
        </View>
        <View style={[styles.tableCell, { flex: COLUMNS[4].flex }]}>
          <Text style={styles.cellDate} numberOfLines={1}>{formatDateTime(item.departure_time)}</Text>
        </View>
        <View style={[styles.tableCell, { flex: COLUMNS[5].flex }]}>
          <Text style={styles.cellDate} numberOfLines={1}>{formatDateTime(item.arrival_time)}</Text>
        </View>
        <View style={[styles.tableCell, { flex: COLUMNS[6].flex }]}>
          <Text style={styles.cellText}>{item.available_seats || 0}/{item.total_seats || 0}</Text>
        </View>
        <View style={[styles.tableCell, { flex: COLUMNS[7].flex }]}>
          <Text style={styles.cellText}>Rs. {item.base_price || 0}</Text>
        </View>
        <View style={[styles.tableCell, { flex: COLUMNS[8].flex }]}>
          <StatusBadge status={item.status} />
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
            onPress={() => handleDelete(item.id || item._id, `SCH-${item.id}`)}
            style={[styles.actionBtn, { backgroundColor: "#FEF2F2" }]}
          >
            <Ionicons name="trash-outline" size={13} color="#ef4444" />
          </TouchableOpacity>
        </View>
      </View>
    </Animated.View>
  );

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
        <Searchbar
          placeholder="Search by code, bus, route, driver or status..."
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
          <Text style={styles.loadingText}>Loading schedules...</Text>
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
              onRefresh={() => fetchSchedules(true)}
              tintColor="#1e3a8a"
              colors={["#1e3a8a"]}
            />
          }
        >
          <View style={styles.statsBar}>
            {[
              { label: "Total", val: totalItems },
              { label: "Scheduled", val: normalizedSchedules.filter((s) => s.status === "scheduled").length },
              { label: "Active", val: normalizedSchedules.filter((s) => s.status === "active").length },
              { label: "Completed", val: normalizedSchedules.filter((s) => s.status === "completed").length },
              { label: "Cancelled", val: normalizedSchedules.filter((s) => s.status === "cancelled").length },
              { label: "Delayed", val: normalizedSchedules.filter((s) => s.status === "delayed").length },
            ].map(({ label, val }, i, arr) => (
              <View key={label} style={[styles.statBox, i < arr.length - 1 && styles.statBoxBorder]}>
                <Text style={[
                  styles.statValue,
                  label === "Scheduled" ? { color: "#3B82F6" } :
                    label === "Active" ? { color: "#16A34A" } :
                      label === "Completed" ? { color: "#6B7280" } :
                        label === "Cancelled" ? { color: "#DC2626" } :
                          label === "Delayed" ? { color: "#CA8A04" } : {}
                ]}>{val}</Text>
                <Text style={styles.statLabel}>{label}</Text>
              </View>
            ))}
          </View>

          <ScrollView horizontal showsHorizontalScrollIndicator={true} style={styles.tableScroll} nestedScrollEnabled={true}>
            <View style={styles.tableContainer}>
              {renderTableHeader()}
              {normalizedSchedules.length > 0 ? (
                normalizedSchedules.map((item, index) => renderTableRow(item, index))
              ) : (
                <View style={styles.emptyTable}>
                  <MaterialCommunityIcons name="calendar-remove-outline" size={48} color="#e2e8f0" />
                  <Text style={styles.emptyText}>
                    {searchQuery ? `No results for "${searchQuery}"` : "No Schedules Found"}
                  </Text>
                  {!searchQuery && (
                    <TouchableOpacity onPress={openCreate} style={styles.emptyAddBtn}>
                      <Ionicons name="add" size={16} color="#fff" />
                      <Text style={styles.emptyAddBtnText}>Add First Schedule</Text>
                    </TouchableOpacity>
                  )}
                </View>
              )}
            </View>
          </ScrollView>

          {normalizedSchedules.length > 0 && (
            <View style={styles.footerContainer}>
              <View style={styles.footerRow}>
                <TouchableOpacity onPress={() => setPageSizeModalVisible(true)} style={styles.pageSizeBtn}>
                  <Text style={styles.pageSizeText}>{limit} rows</Text>
                  <Ionicons name="chevron-down" size={12} color="#64748b" />
                </TouchableOpacity>
                <Text style={styles.entriesInfo}>Showing {startEntry} to {endEntry} of {totalItems} entries</Text>
                <View style={styles.pagination}>
                  <TouchableOpacity disabled={page <= 1}
                    onPress={() => updatePagination("schedules", { page: page - 1 })}
                    style={[styles.paginationBtn, page <= 1 ? styles.paginationBtnDisabled : styles.paginationBtnActive]}>
                    <Text style={[styles.paginationBtnText, page <= 1 ? styles.paginationTextDisabled : styles.paginationTextActive]}>Prev</Text>
                  </TouchableOpacity>
                  {getPageNumbers().map((p) => (
                    <TouchableOpacity key={p} onPress={() => updatePagination("schedules", { page: p })}
                      style={[styles.pageNumBtn, p === page && styles.pageNumBtnActive]}>
                      <Text style={[styles.pageNumText, p === page && styles.pageNumTextActive]}>{p}</Text>
                    </TouchableOpacity>
                  ))}
                  <TouchableOpacity disabled={page >= totalPages}
                    onPress={() => updatePagination("schedules", { page: page + 1 })}
                    style={[styles.paginationBtn, page >= totalPages ? styles.paginationBtnDisabled : styles.paginationBtnActive]}>
                    <Text style={[styles.paginationBtnText, page >= totalPages ? styles.paginationTextDisabled : styles.paginationTextActive]}>Next</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          )}
        </ScrollView>
      )}

      <ScheduleForm visible={modalVisible} editingSchedule={editingSchedule} form={form}
        setForm={setForm} formErrors={formErrors} clearFieldError={clearFieldError}
        saving={saving} onSave={handleSave} onClose={() => setModalVisible(false)}
        buses={buses} routes={routes} />

      <ViewScheduleModal visible={viewModalVisible} schedule={viewingSchedule}
        onClose={() => setViewModalVisible(false)} />

      <PdfPreviewModal visible={pdfModalVisible} uri={pdfUri} onClose={() => setPdfModalVisible(false)} />

      <Portal>
        <Modal visible={exportModalVisible} onDismiss={() => setExportModalVisible(false)} contentContainerStyle={styles.exportModal}>
          <Text style={styles.exportModalTitle}>Export Schedule Data</Text>
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
  dropdownAnchor: {
    backgroundColor: "#FFFFFF", borderWidth: 1, borderColor: "#E2E8F0", borderRadius: 14,
    paddingHorizontal: 16, paddingVertical: 12, flexDirection: "row",
    alignItems: "center", justifyContent: "space-between",
  },
  dropdownAnchorText: { fontSize: 12, fontWeight: "700", color: "#64748B", flex: 1 },
  dropdownModal: { backgroundColor: "#fff", margin: 40, borderRadius: 16, padding: 8 },
  dropdownItem: { paddingHorizontal: 16, paddingVertical: 14, borderRadius: 10 },
  dropdownItemActive: { backgroundColor: "#EFF6FF" },
  dropdownItemText: { fontSize: 12, fontWeight: "700", color: "#1E293B" },
  dropdownItemTextActive: { color: "#1D4ED8" },
  pillRowContainer: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 8 },
  pill: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 9999, borderWidth: 1 },
  pillInactive: { backgroundColor: "#F1F5F9", borderColor: "#E2E8F0" },
  pillText: { fontSize: 10, fontWeight: "800" },
  pillTextActive: { color: "#FFFFFF" },
  pillTextInactive: { color: "#64748B" },
  statusBadgeContainer: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12, alignSelf: "flex-start" },
  statusDot: { width: 6, height: 6, borderRadius: 3 },
  statusLabel: { fontSize: 9, fontWeight: "900" },
  modalContent: { backgroundColor: "#fff", margin: 14, borderRadius: 24, maxHeight: "92%", flex: 1 },
  modalHeader: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingHorizontal: 20, paddingTop: 20, paddingBottom: 16, borderBottomWidth: 1, borderBottomColor: "#F1F5F9",
  },
  modalTitle: { fontSize: 16, fontWeight: "900", color: "#0F172A" },
  modalSubtitle: { fontSize: 10, color: "#94A3B8", marginTop: 2 },
  closeBtn: { width: 36, height: 36, backgroundColor: "#F1F5F9", borderRadius: 14, alignItems: "center", justifyContent: "center" },
  datePickerBtn: {
    backgroundColor: "#FFFFFF", borderWidth: 1, borderColor: "#E2E8F0", borderRadius: 14,
    paddingHorizontal: 16, paddingVertical: 12, marginBottom: 8, flexDirection: "row",
    alignItems: "center", justifyContent: "space-between",
  },
  datePickerText: { fontSize: 12, fontWeight: "700", color: "#64748B" },
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
  tableContainer: { minWidth: 1100, paddingHorizontal: 12 },
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
  cellBusNumber: { fontSize: 12, fontWeight: "900", color: "#0F172A" },
  cellText: { fontSize: 11, fontWeight: "600", color: "#475569" },
  cellType: { fontSize: 10, fontWeight: "700", color: "#64748B" },
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
});
