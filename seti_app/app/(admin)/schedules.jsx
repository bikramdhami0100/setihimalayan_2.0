/**
 * AdminSchedules.jsx – Schedule Manager (NativeWind / Tailwind CSS)
 *
 * Install once:
 *   npx expo install nativewind tailwindcss expo-print expo-sharing expo-file-system react-native-calendars
 *
 * tailwind.config.js  →  content: ["./app/**\/*.{js,jsx,ts,tsx}"]
 * babel.config.js     →  plugins: ["nativewind/babel"]
 */

import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  View, Text, SafeAreaView, ScrollView, TouchableOpacity,
  ActivityIndicator, Alert, FlatList, RefreshControl,
  KeyboardAvoidingView, Platform, StatusBar,
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

// ─── Static config ────────────────────────────────────────────────────────────
const SCHEDULE_STATUSES = ["scheduled", "cancelled", "completed", "delayed"];

const normalizeStatus = (status) => status ?? "scheduled";
const normalizeSchedule = (item) => ({ ...item, status: normalizeStatus(item.status) });

// Full class strings so Tailwind compiler detects them (no interpolation)
const STATUS_CFG = {
  scheduled: { dot: "bg-blue-500",  badge: "bg-blue-100",  text: "text-blue-700",  label: "SCHEDULED" },
  cancelled: { dot: "bg-red-500",   badge: "bg-red-100",   text: "text-red-700",   label: "CANCELLED" },
  completed: { dot: "bg-green-500", badge: "bg-green-100", text: "text-green-700", label: "COMPLETED" },
  delayed:   { dot: "bg-yellow-500",badge: "bg-yellow-100",text: "text-yellow-700",label: "DELAYED"   },
};

const EMPTY_FORM = {
  bus_id: "",
  route_id: "",
  departure_time: "",
  arrival_time: "",
  base_price: "",
  available_seats: "",
  total_seats: "",
  status: "scheduled",
  delay_minutes: "0",
  driver_name: "",
  driver_phone: "",
  conductor_name: "",
  conductor_phone: "",
  notes: "",
};

// ─── Pure helpers ─────────────────────────────────────────────────────────────

/** Map an API schedule item → form state */
const itemToForm = (item) => {
  const fmt = (dt) => {
    if (!dt) return "";
    const d = new Date(dt);
    const pad = (n) => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
  };

  return {
    bus_id:            String(item.bus_id            ?? ""),
    route_id:          String(item.route_id          ?? ""),
    departure_time:    fmt(item.departure_time),
    arrival_time:      fmt(item.arrival_time),
    base_price:        String(item.base_price        ?? ""),
    available_seats:   String(item.available_seats   ?? item.total_seats ?? ""),
    total_seats:       String(item.total_seats       ?? ""),
    status:            normalizeStatus(item.status),
    delay_minutes:     String(item.delay_minutes     ?? 0),
    driver_name:       item.driver_name              ?? "",
    driver_phone:      item.driver_phone             ?? "",
    conductor_name:    item.conductor_name           ?? "",
    conductor_phone:   item.conductor_phone          ?? "",
    notes:             item.notes                    ?? "",
  };
};

/** Map form state → API payload */
const toPayload = (f) => {
  const parseDate = (str) => {
    if (!str) return null;
    try { return new Date(str).toISOString(); } catch { return null; }
  };

  return {
    bus_id:            parseInt(f.bus_id) || null,
    route_id:          parseInt(f.route_id) || null,
    departure_time:    parseDate(f.departure_time),
    arrival_time:      parseDate(f.arrival_time),
    base_price:        parseFloat(f.base_price) || 0,
    total_seats:       parseInt(f.total_seats) || 0,
    available_seats:   parseInt(f.available_seats) || 0,
    status:            f.status,
    delay_minutes:     parseInt(f.delay_minutes) || 0,
    driver_name:       f.driver_name || null,
    driver_phone:      f.driver_phone || null,
    conductor_name:    f.conductor_name || null,
    conductor_phone:   f.conductor_phone || null,
    notes:             f.notes || null,
  };
};

// ─── Export builders ──────────────────────────────────────────────────────────
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
  .cancelled{background:#fee2e2;color:#dc2626}
  .completed{background:#dcfce7;color:#16a34a}
  .delayed{background:#fef9c3;color:#ca8a04}
</style></head><body>
<h1>🕒 Schedule Report</h1>
<p>Generated: ${new Date().toLocaleString()} · ${schedules.length} entries</p>
<table>
  <thead><tr>
    <th>#</th><th>Bus</th><th>Route</th><th>Departure</th><th>Arrival</th>
    <th>Price</th><th>Seats</th><th>Status</th><th>Driver</th><th>Conductor</th><th>Delay</th>
  </tr></thead>
  <tbody>
    ${schedules.map((s, i) => `<tr>
      <td>${i+1}</td>
      <td><strong>${s.bus_number}</strong> (${s.bus_type})</td>
      <td>${s.origin} → ${s.destination}</td>
      <td>${s.departure_time?.split("T")[0]} ${new Date(s.departure_time).toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'})}</td>
      <td>${s.arrival_time?.split("T")[0]} ${new Date(s.arrival_time).toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'})}</td>
      <td>Rs. ${s.base_price}</td>
      <td>${s.available_seats}/${s.total_seats}</td>
      <td><span class="badge ${s.status}">${s.status}</span></td>
      <td>${s.driver_name || "—"}</td>
      <td>${s.conductor_name || "—"}</td>
      <td>${s.delay_minutes} min</td>
    </tr>`).join("")}
  </tbody>
</table></body></html>`;

const buildCSV = (schedules) => {
  const H = ["ID","Bus","Bus Type","Route","Departure","Arrival","Price","Seats Avail/Total","Status","Driver","Conductor","Delay min","Notes"];
  const E = (v) => `"${String(v ?? "").replace(/"/g, '""')}"`;
  const rows = schedules.map((s) => [
    s.id, s.bus_number, s.bus_type, `${s.origin} → ${s.destination}`,
    s.departure_time, s.arrival_time, s.base_price,
    `${s.available_seats}/${s.total_seats}`, s.status,
    s.driver_name, s.conductor_name, s.delay_minutes, s.notes,
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

const exportCSV = async (schedules) => {
  const csv = buildCSV(schedules);
  if (Platform.OS === "web") {
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `schedules_${Date.now()}.csv`;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
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

/** Simple dropdown using react-native-paper Menu */
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

/** Status pill row */
const PillRow = ({ options, value, onChange }) => {
  const activeBgMap = {
    scheduled: "bg-blue-600 border-blue-600",
    cancelled: "bg-red-600 border-red-600",
    completed: "bg-green-600 border-green-600",
    delayed:   "bg-yellow-500 border-yellow-500",
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

/** Coloured status badge */
const StatusBadge = ({ status }) => {
  const s = STATUS_CFG[status] ?? STATUS_CFG.scheduled;
  return (
    <View className={`flex-row items-center gap-1 px-2 py-1 rounded-lg ${s.badge}`}>
      <View className={`w-1.5 h-1.5 rounded-full ${s.dot}`} />
      <Text className={`text-[9px] font-black ${s.text}`}>{s.label}</Text>
    </View>
  );
};

// ─── Schedule Card ──────────────────────────────────────────────────────────
const ScheduleCard = React.memo(({ item, index, onEdit, onDelete, onView, isDeleting }) => {
  const dep = new Date(item.departure_time);
  const arr = new Date(item.arrival_time);
  const timeFmt = (d) => `${d.toLocaleDateString()} ${d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;

  return (
    <Animated.View entering={FadeInDown.delay(index * 40).springify()}>
      <View
        className="bg-white mx-3 mb-3 rounded-2xl p-4 border border-slate-100"
        style={{ shadowColor: "#1e3a8a", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 2 }}
      >
        <View className="flex-row items-start justify-between mb-3">
          <View className="flex-row items-center gap-3 flex-1">
            <View className="bg-blue-50 p-2.5 rounded-xl">
              <MaterialCommunityIcons name="bus-clock" size={22} color="#1e3a8a" />
            </View>
            <View className="flex-1">
              <Text className="text-base font-black text-slate-900" numberOfLines={1}>
                {item.origin} → {item.destination}
              </Text>
              <Text className="text-xs font-bold text-slate-500">
                {item.bus_number} · {item.bus_type}
              </Text>
            </View>
          </View>
          <StatusBadge status={item.status} />
        </View>

        <View className="flex-row flex-wrap gap-3 pt-3 mb-3 border-t border-slate-50">
          <View className="flex-row items-center gap-1">
            <Ionicons name="time-outline" size={13} color="#94a3b8" />
            <Text className="text-xs font-bold text-slate-600">{timeFmt(dep)} → {timeFmt(arr)}</Text>
          </View>
          <View className="flex-row items-center gap-1">
            <Ionicons name="cash-outline" size={13} color="#94a3b8" />
            <Text className="text-xs font-bold text-slate-600">Rs. {item.base_price}</Text>
          </View>
          <View className="flex-row items-center gap-1">
            <Ionicons name="people-outline" size={13} color="#94a3b8" />
            <Text className="text-xs font-bold text-slate-600">{item.available_seats}/{item.total_seats} seats</Text>
          </View>
        </View>

        <View className="flex-row gap-3 mb-3">
          <View className="flex-row items-center gap-1">
            <Ionicons name="person-outline" size={13} color="#94a3b8" />
            <Text className="text-xs font-bold text-slate-600">{item.driver_name || "No driver"}</Text>
          </View>
          <View className="flex-row items-center gap-1">
            <Ionicons name="people-outline" size={13} color="#94a3b8" />
            <Text className="text-xs font-bold text-slate-600">{item.conductor_name || "No conductor"}</Text>
          </View>
        </View>

        <View className="flex-row justify-end gap-2">
          <TouchableOpacity onPress={() => onView(item)} className="flex-row items-center gap-1 bg-blue-50 px-4 py-2 rounded-xl">
            <Ionicons name="eye-outline" size={13} color="#1e3a8a" />
            <Text className="text-xs font-extrabold text-blue-700">View</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => onEdit(item)} className="flex-row items-center gap-1 bg-slate-100 px-4 py-2 rounded-xl">
            <Ionicons name="pencil-outline" size={13} color="#475569" />
            <Text className="text-xs font-extrabold text-slate-600">Edit</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => onDelete(item.id, `${item.origin}→${item.destination}`)}
            className="flex-row items-center gap-1 bg-red-50 px-4 py-2 rounded-xl"
          >
            <Ionicons name="trash-outline" size={13} color="#ef4444" />
            <Text className="text-xs font-extrabold text-red-500">Delete</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Animated.View>
  );
});

// ─── DateTimePicker (Calendar + Time) ────────────────────────────────────────
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
      <TouchableOpacity
        onPress={() => setShowCalendar(true)}
        className="bg-white border border-slate-200 rounded-xl px-4 py-3 mb-3 flex-row items-center justify-between"
      >
        <Text className="text-sm font-bold text-slate-500">
          {dateStr ? dateStr : `Select ${label} date`}
        </Text>
        <Ionicons name="calendar-outline" size={18} color="#64748b" />
      </TouchableOpacity>

      <Field
        label={label + ' time (HH:MM)'}
        value={timeStr}
        onChangeText={handleTimeChange}
        keyboardType="numbers-and-punctuation"
        placeholder="e.g. 14:30"
      />

      <Portal>
        <Modal
          visible={showCalendar}
          onDismiss={() => setShowCalendar(false)}
          contentContainerStyle={{ backgroundColor: "#fff", margin: 20, borderRadius: 20, padding: 16 }}
        >
          <Calendar
            onDayPress={handleDateSelect}
            markedDates={marked}
            minDate={minDate}
            theme={{
              selectedDayBackgroundColor: '#1e3a8a',
              arrowColor: '#1e3a8a',
              todayTextColor: '#1e3a8a',
            }}
          />
        </Modal>
      </Portal>
    </>
  );
};

// ─── Create / Edit Form Modal ─────────────────────────────────────────────────
const ScheduleForm = ({ visible, editingSchedule, form, setForm, saving, onSave, onClose, buses, routes }) => {
  const busOptions = buses.map(b => ({ label: `${b.bus_number} (${b.bus_type})`, value: b.id.toString() }));
  const routeOptions = routes.map(r => ({ label: `${r.origin} → ${r.destination}`, value: r.id.toString() }));

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
                  {editingSchedule ? "Edit Schedule" : "New Schedule"}
                </Text>
                <Text className="text-xs text-slate-400 mt-0.5">
                  {editingSchedule ? `Updating ${editingSchedule.origin} → ${editingSchedule.destination}` : "Add a trip schedule"}
                </Text>
              </View>
              <TouchableOpacity onPress={onClose} className="w-9 h-9 bg-slate-100 rounded-xl items-center justify-center">
                <Ionicons name="close" size={17} color="#64748b" />
              </TouchableOpacity>
            </View>

            <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 30 }} className="px-5" showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
              {/* Bus & Route selection */}
              <SectionLabel>Bus & Route</SectionLabel>
              <Dropdown label="Bus" value={form.bus_id} options={busOptions} onSelect={(v) => setForm({ ...form, bus_id: v })} />
              <Dropdown label="Route" value={form.route_id} options={routeOptions} onSelect={(v) => setForm({ ...form, route_id: v })} />

              {/* Schedule time – now using DateTimePicker */}
              <SectionLabel>Schedule Time</SectionLabel>
              <DateTimePicker
                label="Departure"
                value={form.departure_time}
                onChange={(v) => setForm({ ...form, departure_time: v })}
              />
              <DateTimePicker
                label="Arrival"
                value={form.arrival_time}
                onChange={(v) => setForm({ ...form, arrival_time: v })}
                minDate={form.departure_time?.split(' ')[0]}
              />

              {/* Pricing & Seats */}
              <SectionLabel>Pricing & Capacity</SectionLabel>
              <View className="flex-row gap-2">
                <View className="flex-1"><Field label="Base Price" value={form.base_price} onChangeText={(t) => setForm({ ...form, base_price: t })} keyboardType="numeric" /></View>
                <View className="flex-1"><Field label="Total Seats" value={form.total_seats} onChangeText={(t) => setForm({ ...form, total_seats: t })} keyboardType="numeric" /></View>
              </View>
              <Field label="Available Seats" value={form.available_seats} onChangeText={(t) => setForm({ ...form, available_seats: t })} keyboardType="numeric" />

              {/* Status & Delay */}
              <SectionLabel>Status</SectionLabel>
              <PillRow options={SCHEDULE_STATUSES} value={form.status} onChange={(v) => setForm({ ...form, status: v })} />
              {form.status === "delayed" && (
                <Field label="Delay (minutes)" value={form.delay_minutes} onChangeText={(t) => setForm({ ...form, delay_minutes: t })} keyboardType="numeric" />
              )}

              {/* Staff */}
              <SectionLabel>Staff</SectionLabel>
              <View className="flex-row gap-2">
                <View className="flex-1"><Field label="Driver Name" value={form.driver_name} onChangeText={(t) => setForm({ ...form, driver_name: t })} /></View>
                <View className="flex-1"><Field label="Driver Phone" value={form.driver_phone} onChangeText={(t) => setForm({ ...form, driver_phone: t })} keyboardType="phone-pad" /></View>
              </View>
              <View className="flex-row gap-2">
                <View className="flex-1"><Field label="Conductor Name" value={form.conductor_name} onChangeText={(t) => setForm({ ...form, conductor_name: t })} /></View>
                <View className="flex-1"><Field label="Conductor Phone" value={form.conductor_phone} onChangeText={(t) => setForm({ ...form, conductor_phone: t })} keyboardType="phone-pad" /></View>
              </View>

              {/* Notes */}
              <SectionLabel>Notes</SectionLabel>
              <Field label="Additional notes…" value={form.notes} onChangeText={(t) => setForm({ ...form, notes: t })} multiline numberOfLines={3} />

              {/* Buttons */}
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
                  {saving ? <ActivityIndicator color="#fff" /> : <Text className="font-black text-white text-sm">{editingSchedule ? "UPDATE SCHEDULE" : "CREATE SCHEDULE"}</Text>}
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </Portal>
  );
};

// ─── View Schedule Modal ─────────────────────────────────────────────────────
const ViewScheduleModal = ({ visible, schedule, onClose }) => {
  if (!schedule) return null;
  const dep = new Date(schedule.departure_time);
  const arr = new Date(schedule.arrival_time);
  const fmt = (d) => `${d.toLocaleDateString()} ${d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;

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
              <Text className="text-lg font-black text-slate-900">Schedule Detail</Text>
              <Text className="text-xs text-slate-400 mt-0.5">{schedule.origin} → {schedule.destination}</Text>
            </View>
            <TouchableOpacity onPress={onClose} className="w-9 h-9 bg-slate-100 rounded-xl items-center justify-center">
              <Ionicons name="close" size={17} color="#64748b" />
            </TouchableOpacity>
          </View>

          <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 30 }} className="px-5" showsVerticalScrollIndicator={false}>
            <SectionLabel>Bus & Route</SectionLabel>
            <View className="mb-3"><Text className="text-sm font-semibold text-slate-900">{schedule.bus_number} ({schedule.bus_type})</Text></View>
            <View className="mb-3"><Text className="text-sm font-semibold text-slate-900">{schedule.origin} → {schedule.destination}</Text></View>

            <SectionLabel>Timing</SectionLabel>
            <View className="mb-3"><Text className="text-sm font-semibold text-slate-900">Departure: {fmt(dep)}</Text></View>
            <View className="mb-3"><Text className="text-sm font-semibold text-slate-900">Arrival: {fmt(arr)}</Text></View>

            <SectionLabel>Pricing & Capacity</SectionLabel>
            <View className="mb-3"><Text className="text-sm font-semibold text-slate-900">Price: Rs. {schedule.base_price}</Text></View>
            <View className="mb-3"><Text className="text-sm font-semibold text-slate-900">Seats: {schedule.available_seats}/{schedule.total_seats}</Text></View>

            <SectionLabel>Status</SectionLabel>
            <View className="mb-3"><Text className="text-sm font-semibold text-slate-900">{schedule.status}</Text></View>
            {schedule.delay_minutes > 0 && <View className="mb-3"><Text className="text-sm font-semibold text-red-600">Delay: {schedule.delay_minutes} min</Text></View>}

            <SectionLabel>Staff</SectionLabel>
            <View className="mb-3"><Text className="text-sm font-semibold text-slate-900">Driver: {schedule.driver_name || "—"}</Text></View>
            <View className="mb-3"><Text className="text-sm font-semibold text-slate-900">Conductor: {schedule.conductor_name || "—"}</Text></View>

            {schedule.notes && (
              <>
                <SectionLabel>Notes</SectionLabel>
                <View className="mb-3"><Text className="text-sm font-semibold text-slate-900">{schedule.notes}</Text></View>
              </>
            )}

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
export default function AdminSchedules() {
  const {
    schedules,
    loading:    loadingStates,
    refreshing: refreshingStates,
    getPagination,
    updatePagination,
    getSearchQuery,
    updateSearchQuery,
    fetchSchedules,
    buses,
    routes,
  } = useAdminData();

  const loading    = loadingStates.schedules;
  const refreshing = refreshingStates.schedules;
  const { page, limit, total: totalItems } = getPagination("schedules");
  const searchQuery = getSearchQuery("schedules");

  const [searchInput,    setSearchInput]    = useState(searchQuery);
  const [modalVisible,   setModalVisible]   = useState(false);
  const [exportModalVisible, setExportModalVisible] = useState(false);
  const [viewModalVisible, setViewModalVisible] = useState(false);
  const [editingSchedule, setEditingSchedule] = useState(null);
  const [viewingSchedule, setViewingSchedule] = useState(null);
  const [saving,          setSaving]          = useState(false);
  const [deleting,        setDeleting]        = useState(false);
  const [exporting,       setExporting]       = useState(false);
  const [form,            setForm]            = useState({ ...EMPTY_FORM });
  const debounceRef = useRef(null);

  useEffect(() => { fetchSchedules(); }, [page, limit, searchQuery]);

  const commitSearch = useCallback(
    (text) => updateSearchQuery("schedules", text),
    [updateSearchQuery],
  );

  const handleSearch = (text) => {
    setSearchInput(text);
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => commitSearch(text), 500);
  };

  const openCreate = () => { setEditingSchedule(null); setForm({ ...EMPTY_FORM }); setModalVisible(true); };
  const openEdit   = (item) => { setEditingSchedule(item); setForm(itemToForm(item)); setModalVisible(true); };
  const openView   = (item) => { setViewingSchedule(item); setViewModalVisible(true); };

  const handleSave = async () => {
    if (!form.bus_id || !form.route_id || !form.departure_time || !form.arrival_time) {
      return Alert.alert("Required", "Bus, Route, Departure and Arrival are required.");
    }
    setSaving(true);
    try {
      editingSchedule
        ? await updateSchedule(editingSchedule.id, toPayload(form))
        : await createSchedule(toPayload(form));
      setModalVisible(false);
      fetchSchedules(true);
    } catch (e) {
      Alert.alert("Error", "Could not save schedule. Please try again.");
    } finally { setSaving(false); }
  };

  const handleDelete = (id, name) => {
    Alert.alert("Remove Schedule", `Delete schedule "${name}"?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          setDeleting(true);
          try {
            await deleteSchedule(id);
            fetchSchedules(true);
          } catch (e) {
            Alert.alert("Error", "Could not delete. Please try again.");
          } finally { setDeleting(false); }
        },
      },
    ]);
  };

  const handleExport = async (type) => {
    setExportModalVisible(false);
    setExporting(true);
    try {
      if (type === "csv") await exportCSV(schedules);
      if (type === "pdf") await exportPDF(schedules);
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
            <Text className="text-xl font-black text-white tracking-tight">Schedule Manager</Text>
            <Text className="text-xs text-blue-300 font-semibold mt-0.5">
              {totalItems} schedule{totalItems !== 1 ? "s" : ""} found
            </Text>
          </View>

          <View className="flex-row items-center gap-2">
            <TouchableOpacity
              onPress={() => setExportModalVisible(true)}
              disabled={exporting || schedules.length === 0}
              className="w-11 h-11 rounded-xl items-center justify-center"
              style={{ backgroundColor: "rgba(255,255,255,0.15)" }}
            >
              {exporting ? <ActivityIndicator size="small" color="#fff" /> : <Ionicons name="share-outline" size={20} color="#fff" />}
            </TouchableOpacity>
            <TouchableOpacity onPress={openCreate} className="flex-row items-center gap-1.5 bg-white px-4 h-11 rounded-xl">
              <Ionicons name="add-circle" size={17} color="#1e3a8a" />
              <Text className="font-black text-blue-900 text-xs">ADD SCHEDULE</Text>
            </TouchableOpacity>
          </View>
        </View>

        <Searchbar
          placeholder="Search by bus, route or status..."
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
          <Text className="mt-3 text-slate-400 font-bold text-sm">Loading schedules...</Text>
        </View>
      ) : (
        <FlatList
          style={{ flex: 1 }}
          data={schedules}
          keyExtractor={(item) => item.id?.toString()}
          renderItem={({ item, index }) => (
            <ScheduleCard
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
                { label: "Scheduled",   val: schedules.filter(s => s.status === "scheduled").length },
                { label: "Completed",   val: schedules.filter(s => s.status === "completed").length },
                { label: "Cancelled",   val: schedules.filter(s => s.status === "cancelled").length },
              ].map(({ label, val }, i, arr) => (
                <View key={label} className={`flex-1 items-center py-3 ${i < arr.length - 1 ? "border-r border-slate-100" : ""}`}>
                  <Text className={`text-xl font-black text-blue-900`}>{val}</Text>
                  <Text className="text-[9px] text-slate-400 font-bold uppercase tracking-wider mt-0.5">{label}</Text>
                </View>
              ))}
            </View>
          }
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => fetchSchedules(true)}
              tintColor="#1e3a8a"
              colors={["#1e3a8a"]}
            />
          }
          ListEmptyComponent={() => (
            <View className="items-center pt-24 px-10">
              <MaterialCommunityIcons name="calendar-remove-outline" size={72} color="#e2e8f0" />
              <Text className="mt-4 text-slate-400 font-extrabold text-base text-center">
                {searchQuery ? `No results for "${searchQuery}"` : "No schedules found"}
              </Text>
              {!searchQuery && (
                <TouchableOpacity onPress={openCreate} className="mt-5 flex-row items-center gap-2 bg-blue-900 px-6 py-3 rounded-2xl">
                  <Ionicons name="add" size={16} color="#fff" />
                  <Text className="text-white font-black text-sm">Add First Schedule</Text>
                </TouchableOpacity>
              )}
            </View>
          )}
          ListFooterComponent={() =>
            schedules.length > 0 ? (
              <View className="mx-3 mt-1 mb-6">
                <View className="flex-row items-center justify-between bg-white rounded-2xl px-4 py-3 border border-slate-100">
                  <Text className="text-xs text-slate-400 font-bold">
                    Page {page} / {totalPages} · {schedules.length} of {totalItems}
                  </Text>
                  <View className="flex-row gap-2">
                    <TouchableOpacity
                      disabled={page <= 1}
                      onPress={() => updatePagination("schedules", { page: page - 1 })}
                      className={`px-4 py-2 rounded-xl border ${page <= 1 ? "bg-slate-50 border-slate-200" : "bg-blue-900 border-blue-900"}`}
                    >
                      <Text className={`text-xs font-extrabold ${page <= 1 ? "text-slate-300" : "text-white"}`}>← Prev</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      disabled={page >= totalPages}
                      onPress={() => updatePagination("schedules", { page: page + 1 })}
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
      <ScheduleForm
        visible={modalVisible}
        editingSchedule={editingSchedule}
        form={form}
        setForm={setForm}
        saving={saving}
        onSave={handleSave}
        onClose={() => setModalVisible(false)}
        buses={buses}
        routes={routes}
      />

      {/* View Modal */}
      <ViewScheduleModal
        visible={viewModalVisible}
        schedule={viewingSchedule}
        onClose={() => setViewModalVisible(false)}
      />

      {/* Export modal */}
      <Portal>
        <Modal
          visible={exportModalVisible}
          onDismiss={() => setExportModalVisible(false)}
          contentContainerStyle={{ backgroundColor: "white", marginHorizontal: 40, borderRadius: 16, padding: 16 }}
        >
          <Text className="text-base font-black text-slate-800 mb-3">Export Schedule Data</Text>
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