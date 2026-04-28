/**
 * AdminBuses.jsx  –  Fleet Manager (NativeWind / Tailwind CSS)
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
import { Portal, Modal, TextInput, Searchbar } from "react-native-paper";
import { Calendar } from "react-native-calendars";   // ✅ for date fields
import * as Print      from "expo-print";
import * as Sharing    from "expo-sharing";
import * as FileSystem from "expo-file-system";
import Animated, { FadeInDown } from "react-native-reanimated";
import { createBus, deleteBus, updateBus } from "../../api/buses";
import { useAdminData } from "../../context/AdminContext";

// ─── Static config ────────────────────────────────────────────────────────────
const BUS_TYPES = ["Luxury", "Standard", "Mini", "Sleeper"];
const STATUSES  = ["active", "inactive", "maintenance"];
const AMENITIES = ["AC", "WiFi", "Charging Point", "TV", "Snacks", "Water", "Blanket", "Pillow"];

const normalizeStatus = (status) => status === 'retired' ? 'inactive' : status;
const normalizeBus = (item) => ({ ...item, status: normalizeStatus(item.status) });

// Full class strings so Tailwind compiler detects them (no interpolation)
const STATUS_CFG = {
  active:      { dot: "bg-green-500",  badge: "bg-green-100",  text: "text-green-700",  label: "ACTIVE"      },
  inactive:    { dot: "bg-red-500",    badge: "bg-red-100",    text: "text-red-700",    label: "INACTIVE"    },
  maintenance: { dot: "bg-yellow-500", badge: "bg-yellow-100", text: "text-yellow-700", label: "MAINTENANCE" },
};

const EMPTY_FORM = {
  bus_number: "", registration_number: "", license_plate: "",
  bus_type: "Luxury", status: "active",
  total_seats: "40", seat_rows: "10", seat_columns: "4", seat_layout_type: "2x2",
  amenities: [],
  manufacturer: "", model: "", year: "", color: "",
  insurance_expiry: "", fitness_expiry: "", notes: "",
};

// ─── Pure helpers ─────────────────────────────────────────────────────────────
const parseAmenities = (raw) => {
  if (Array.isArray(raw)) return raw;
  try { return JSON.parse(raw || "[]"); } catch { return []; }
};
const parseSeatLayout = (raw) => {
  try { return JSON.parse(raw || "{}"); } catch { return {}; }
};

/** Map an API bus item → form state */
const itemToForm = (item) => {
  const sl = parseSeatLayout(item.seat_layout);
  return {
    bus_number:          item.bus_number          ?? "",
    registration_number: item.registration_number ?? "",
    license_plate:       item.license_plate        ?? "",
    bus_type:            item.bus_type             ?? "Luxury",
    status:              normalizeStatus(item.status ?? "active"),
    total_seats:         String(item.total_seats   ?? 40),
    seat_rows:           String(sl.rows            ?? 10),
    seat_columns:        String(sl.columns         ?? 4),
    seat_layout_type:    sl.layout                 ?? "2x2",
    amenities:           parseAmenities(item.amenities),
    manufacturer:        item.manufacturer         ?? "",
    model:               item.model                ?? "",
    year:                item.year ? String(item.year) : "",
    color:               item.color                ?? "",
    insurance_expiry:    item.insurance_expiry ? item.insurance_expiry.split("T")[0] : "",
    fitness_expiry:      item.fitness_expiry   ? item.fitness_expiry.split("T")[0]   : "",
    notes:               item.notes                ?? "",
  };
};

/** Map form state → API payload */
const toPayload = (f) => ({
  bus_number:          f.bus_number,
  registration_number: f.registration_number,
  license_plate:       f.license_plate  || null,
  bus_type:            f.bus_type,
  status:              f.status === 'inactive' ? 'retired' : f.status,
  total_seats:         parseInt(f.total_seats) || 40,
  seat_layout: {
    rows:    parseInt(f.seat_rows)    || 10,
    columns: parseInt(f.seat_columns) || 4,
    layout:  f.seat_layout_type       || "2x2",
  },
  amenities:           f.amenities,
  manufacturer:        f.manufacturer  || null,
  model:               f.model         || null,
  year:                f.year ? parseInt(f.year) : null,
  color:               f.color         || null,
  insurance_expiry:    f.insurance_expiry || null,
  fitness_expiry:      f.fitness_expiry   || null,
  notes:               f.notes            || null,
});

// ─── Export builders ──────────────────────────────────────────────────────────
const buildHTML = (buses) => `<!DOCTYPE html><html><head><meta charset="utf-8"/>
<style>
  body{font-family:Arial,sans-serif;padding:28px;color:#1e293b}
  h1{color:#1e3a8a;font-size:22px;font-weight:900;margin:0}
  p{color:#64748b;font-size:12px;margin:4px 0 24px}
  table{width:100%;border-collapse:collapse;font-size:12px}
  th{background:#1e3a8a;color:#fff;padding:10px 12px;text-align:left;font-size:10px;text-transform:uppercase}
  td{padding:9px 12px;border-bottom:1px solid #e2e8f0}
  tr:nth-child(even) td{background:#f8fafc}
  .badge{display:inline-block;padding:2px 8px;border-radius:12px;font-size:10px;font-weight:700}
  .active{background:#dcfce7;color:#16a34a}
  .inactive{background:#fee2e2;color:#dc2626}
  .maintenance{background:#fef9c3;color:#ca8a04}
</style></head><body>
<h1>🚌 Fleet Report</h1>
<p>Generated: ${new Date().toLocaleString()} · ${buses.length} vehicles</p>
<table>
  <thead><tr>
    <th>#</th><th>Bus No.</th><th>Reg. No.</th><th>License</th>
    <th>Type</th><th>Status</th><th>Seats</th><th>Amenities</th>
    <th>Make / Model</th><th>Year</th><th>Insurance Exp.</th><th>Fitness Exp.</th>
  </tr></thead>
  <tbody>
    ${buses.map((b, i) => `<tr>
      <td>${i + 1}</td>
      <td><strong>${b.bus_number}</strong></td>
      <td>${b.registration_number}</td>
      <td>${b.license_plate || "—"}</td>
      <td>${b.bus_type}</td>
      <td><span class="badge ${b.status}">${b.status}</span></td>
      <td>${b.total_seats}</td>
      <td>${parseAmenities(b.amenities).join(", ") || "—"}</td>
      <td>${[b.manufacturer, b.model].filter(Boolean).join(" ") || "—"}</td>
      <td>${b.year || "—"}</td>
      <td>${b.insurance_expiry?.split("T")[0] || "—"}</td>
      <td>${b.fitness_expiry?.split("T")[0]   || "—"}</td>
    </tr>`).join("")}
  </tbody>
</table></body></html>`;

const buildCSV = (buses) => {
  const H = ["ID","Bus Number","Registration","License","Type","Status","Seats",
             "Amenities","Manufacturer","Model","Year","Color","Ins. Expiry","Fit. Expiry","Notes"];
  const E = (v) => `"${String(v ?? "").replace(/"/g, '""')}"`;
  const rows = buses.map((b) => [
    b.id, b.bus_number, b.registration_number, b.license_plate,
    b.bus_type, b.status, b.total_seats, parseAmenities(b.amenities).join("; "),
    b.manufacturer, b.model, b.year, b.color,
    b.insurance_expiry?.split("T")[0], b.fitness_expiry?.split("T")[0], b.notes,
  ].map(E).join(","));
  return [H.map(E).join(","), ...rows].join("\r\n");
};

const shareFile = async (path, mimeType, dialogTitle) => {
  let uri = path;
  if (Platform.OS === 'android') {
    try {
      const contentUri = await FileSystem.getContentUriAsync(path);
      uri = contentUri.uri;
    } catch {
      uri = path;
    }
  }
  await Sharing.shareAsync(uri, { mimeType, dialogTitle });
};

const exportCSV = async (buses) => {
  const csv = buildCSV(buses);
  if (Platform.OS === "web") {
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `fleet_${Date.now()}.csv`;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
    return;
  }

  const path = `${FileSystem.cacheDirectory}fleet_${Date.now()}.csv`;
  await FileSystem.writeAsStringAsync(path, csv, { encoding: FileSystem.EncodingType.UTF8 });
  await shareFile(path, "text/csv", "Export CSV");
};
const exportPDF = async (buses) => {
  const html = buildHTML(buses);
  if (Platform.OS === "web") {
    try {
      const { uri } = await Print.printToFileAsync({ html });
      if (uri) {
        const anchor = document.createElement("a");
        anchor.href = uri;
        anchor.download = `fleet_${Date.now()}.pdf`;
        document.body.appendChild(anchor);
        anchor.click();
        anchor.remove();
        return;
      }
    } catch (error) {
      console.warn('Web PDF export fallback:', error);
    }
    await Print.printAsync({ html });
    return;
  }

  const { uri } = await Print.printToFileAsync({ html });
  await shareFile(uri, "application/pdf", "Export PDF");
};

// ─── Reusable atoms ───────────────────────────────────────────────────────────

/** Labelled section heading inside the form */
const SectionLabel = ({ children }) => (
  <Text className="text-blue-900 text-[10px] font-black uppercase tracking-widest mt-5 mb-2">
    {children}
  </Text>
);

/** react-native-paper TextInput with consistent theming */
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

/** NEW: Date picker using react-native-calendars for date-only fields */
const DatePicker = ({ label, value, onChange, minDate }) => {
  const [showCalendar, setShowCalendar] = useState(false);

  const handleDateSelect = (day) => {
    onChange(day.dateString);   // "YYYY-MM-DD"
    setShowCalendar(false);
  };

  const marked = value ? { [value]: { selected: true, selectedColor: '#1e3a8a' } } : {};

  return (
    <>
      <TouchableOpacity
        onPress={() => setShowCalendar(true)}
        className="bg-white border border-slate-200 rounded-xl px-4 py-3 mb-3 flex-row items-center justify-between"
      >
        <Text className="text-sm font-bold text-slate-500">
          {value ? value : `Select ${label}`}
        </Text>
        <Ionicons name="calendar-outline" size={18} color="#64748b" />
      </TouchableOpacity>

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

/** Pill option row (Bus Type / Status) */
const PillRow = ({ options, value, onChange }) => (
  <View className="flex-row flex-wrap gap-2 mb-2">
    {options.map((opt) => {
      const on = value === opt;
      const activeBg =
        opt === "active"      ? "bg-green-600 border-green-600"
        : opt === "inactive"    ? "bg-red-600 border-red-600"
        : opt === "maintenance" ? "bg-yellow-500 border-yellow-500"
        : "bg-blue-900 border-blue-900";
      return (
        <TouchableOpacity
          key={opt}
          onPress={() => onChange(opt)}
          className={`px-4 py-2 rounded-full border ${on ? activeBg : "bg-slate-100 border-slate-200"}`}
        >
          <Text className={`text-xs font-extrabold ${on ? "text-white" : "text-slate-500"}`}>
            {opt}
          </Text>
        </TouchableOpacity>
      );
    })}
  </View>
);

/** Amenity multi-select chips */
const AmenityPicker = ({ selected, onChange }) => {
  const toggle = (a) =>
    onChange(selected.includes(a) ? selected.filter((x) => x !== a) : [...selected, a]);
  return (
    <View className="flex-row flex-wrap gap-2 mb-2">
      {AMENITIES.map((a) => {
        const on = selected.includes(a);
        return (
          <TouchableOpacity
            key={a}
            onPress={() => toggle(a)}
            className={`flex-row items-center gap-1 px-3 py-1.5 rounded-2xl border ${
              on ? "bg-blue-100 border-blue-400" : "bg-slate-50 border-slate-200"
            }`}
          >
            {on && <Ionicons name="checkmark-circle" size={11} color="#2563eb" />}
            <Text className={`text-xs font-bold ${on ? "text-blue-700" : "text-slate-400"}`}>{a}</Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
};

/** Coloured status badge for cards */
const StatusBadge = ({ status }) => {
  const s = STATUS_CFG[status] ?? STATUS_CFG.inactive;
  return (
    <View className={`flex-row items-center gap-1 px-2 py-1 rounded-lg ${s.badge}`}>
      <View className={`w-1.5 h-1.5 rounded-full ${s.dot}`} />
      <Text className={`text-[9px] font-black ${s.text}`}>{s.label}</Text>
    </View>
  );
};

// ─── Bus card row ─────────────────────────────────────────────────────────────
const BusCard = React.memo(({ item, index, onEdit, onDelete, onView, isDeleting }) => {
  const amenities = parseAmenities(item.amenities);
  const make      = [item.manufacturer, item.model, item.year ? `(${item.year})` : null]
    .filter(Boolean).join(" ");

  return (
    <Animated.View entering={FadeInDown.delay(index * 40).springify()}>
      <View
        className="bg-white mx-3 mb-3 rounded-2xl p-4 border border-slate-100"
        style={{ shadowColor: "#1e3a8a", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 2 }}
      >
        {/* Bus number + status */}
        <View className="flex-row items-start justify-between mb-3">
          <View className="flex-row items-center gap-3 flex-1">
            <View className="bg-blue-50 p-2.5 rounded-xl">
              <MaterialCommunityIcons name="bus" size={22} color="#1e3a8a" />
            </View>
            <View className="flex-1">
              <Text className="text-base font-black text-slate-900" numberOfLines={1}>
                {item.bus_number}
              </Text>
              <Text className="text-xs font-bold text-slate-500">
                {item.bus_type} · {item.total_seats} seats
              </Text>
            </View>
          </View>
          <StatusBadge status={item.status} />
        </View>

        {/* Registration / license / make */}
        <View className="flex-row flex-wrap gap-3 pt-3 mb-3 border-t border-slate-50">
          <View className="flex-row items-center gap-1">
            <Ionicons name="card-outline" size={13} color="#94a3b8" />
            <Text className="text-xs font-bold text-slate-600">{item.registration_number}</Text>
          </View>
          {item.license_plate ? (
            <View className="flex-row items-center gap-1">
              <Ionicons name="id-card-outline" size={13} color="#94a3b8" />
              <Text className="text-xs font-bold text-slate-600">{item.license_plate}</Text>
            </View>
          ) : null}
          {make ? (
            <View className="flex-row items-center gap-1">
              <Ionicons name="construct-outline" size={13} color="#94a3b8" />
              <Text className="text-xs font-bold text-slate-600">{make}</Text>
            </View>
          ) : null}
        </View>

        {/* Amenity chips */}
        {amenities.length > 0 && (
          <View className="flex-row flex-wrap gap-1 mb-3">
            {amenities.map((a) => (
              <View key={a} className="bg-blue-100 px-2 py-0.5 rounded-md">
                <Text className="text-[9px] font-extrabold text-blue-700">{a}</Text>
              </View>
            ))}
          </View>
        )}

        {/* View / Edit / Delete */}
        <View className="flex-row justify-end gap-2">
          <TouchableOpacity
            onPress={() => onView(item)}
            className="flex-row items-center gap-1 bg-blue-50 px-4 py-2 rounded-xl"
          >
            <Ionicons name="eye-outline" size={13} color="#1e3a8a" />
            <Text className="text-xs font-extrabold text-blue-700">View</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => onEdit(item)}
            className="flex-row items-center gap-1 bg-slate-100 px-4 py-2 rounded-xl"
          >
            <Ionicons name="pencil-outline" size={13} color="#475569" />
            <Text className="text-xs font-extrabold text-slate-600">Edit</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => {
              const id = item.id || item._id;
              console.log("Delete button pressed — bus:", item.bus_number, "ID:", id);
              onDelete(id, item.bus_number);
            }}
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

// ─── Create / Edit form modal (with DatePicker for expiry fields) ───────────
const BusForm = ({ visible, editingBus, form, setForm, saving, onSave, onClose }) => (
  <Portal>
    <Modal
      visible={visible}
      onDismiss={onClose}
      contentContainerStyle={{
        backgroundColor: "#fff", margin: 14, borderRadius: 24, maxHeight: "92%",
      }}
    >
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : "height"}>
        <View style={{ flex: 1 }}>
          {/* Modal header */}
          <View className="flex-row items-center justify-between px-5 pt-5 pb-4 border-b border-slate-100">
            <View>
              <Text className="text-lg font-black text-slate-900">
                {editingBus ? "Edit Vehicle" : "Register Vehicle"}
              </Text>
              <Text className="text-xs text-slate-400 mt-0.5">
                {editingBus ? `Updating ${editingBus.bus_number}` : "Add a new bus to your fleet"}
              </Text>
            </View>
            <TouchableOpacity
              onPress={onClose}
              className="w-9 h-9 bg-slate-100 rounded-xl items-center justify-center"
            >
              <Ionicons name="close" size={17} color="#64748b" />
            </TouchableOpacity>
          </View>

          <ScrollView
            style={{ flex: 1 }}
            contentContainerStyle={{ paddingBottom: 30 }}
            className="px-5"
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >

          {/* Basic info */}
          <SectionLabel>Basic Information</SectionLabel>
          <Field label="Bus Number *"          value={form.bus_number}          onChangeText={(t) => setForm({ ...form, bus_number: t })} />
          <Field label="Registration Number *" value={form.registration_number} onChangeText={(t) => setForm({ ...form, registration_number: t })} />
          <Field label="License Plate"         value={form.license_plate}       onChangeText={(t) => setForm({ ...form, license_plate: t })} />

          {/* Type & Status */}
          <SectionLabel>Bus Type</SectionLabel>
          <PillRow options={BUS_TYPES} value={form.bus_type} onChange={(v) => setForm({ ...form, bus_type: v })} />

          <SectionLabel>Status</SectionLabel>
          <PillRow options={STATUSES} value={form.status} onChange={(v) => setForm({ ...form, status: v })} />

          {/* Capacity */}
          <SectionLabel>Seating Capacity</SectionLabel>
          <View className="flex-row gap-2">
            <View className="flex-1">
              <Field label="Seats" value={form.total_seats}      onChangeText={(t) => setForm({ ...form, total_seats: t })}      keyboardType="numeric" />
            </View>
            <View className="flex-1">
              <Field label="Rows"  value={form.seat_rows}        onChangeText={(t) => setForm({ ...form, seat_rows: t })}        keyboardType="numeric" />
            </View>
            <View className="flex-1">
              <Field label="Cols"  value={form.seat_columns}     onChangeText={(t) => setForm({ ...form, seat_columns: t })}     keyboardType="numeric" />
            </View>
          </View>
          <Field label="Layout (e.g. 2x2)" value={form.seat_layout_type} onChangeText={(t) => setForm({ ...form, seat_layout_type: t })} />

          {/* Amenities */}
          <SectionLabel>Amenities</SectionLabel>
          <AmenityPicker selected={form.amenities} onChange={(a) => setForm({ ...form, amenities: a })} />

          {/* Vehicle details */}
          <SectionLabel>Vehicle Details</SectionLabel>
          <View className="flex-row gap-2">
            <View className="flex-1"><Field label="Manufacturer" value={form.manufacturer} onChangeText={(t) => setForm({ ...form, manufacturer: t })} /></View>
            <View className="flex-1"><Field label="Model"        value={form.model}        onChangeText={(t) => setForm({ ...form, model: t })} /></View>
          </View>
          <View className="flex-row gap-2">
            <View className="flex-1"><Field label="Year"  value={form.year}  onChangeText={(t) => setForm({ ...form, year: t })}  keyboardType="numeric" /></View>
            <View className="flex-1"><Field label="Color" value={form.color} onChangeText={(t) => setForm({ ...form, color: t })} /></View>
          </View>

          {/* Compliance – NOW USING DatePicker */}
          <SectionLabel>Compliance &amp; Expiry</SectionLabel>
          <DatePicker
            label="Insurance Expiry"
            value={form.insurance_expiry}
            onChange={(date) => setForm({ ...form, insurance_expiry: date })}
          />
          <DatePicker
            label="Fitness Expiry"
            value={form.fitness_expiry}
            onChange={(date) => setForm({ ...form, fitness_expiry: date })}
            minDate={form.insurance_expiry || undefined}
          />

          {/* Notes */}
          <SectionLabel>Notes</SectionLabel>
          <Field label="Additional notes…" value={form.notes} onChangeText={(t) => setForm({ ...form, notes: t })} multiline numberOfLines={3} />

          {/* Action buttons */}
          <View className="flex-row gap-3 mt-4 mb-10">
            <TouchableOpacity
              onPress={onClose}
              className="flex-1 py-4 rounded-2xl items-center bg-slate-100 border border-slate-200"
            >
              <Text className="font-extrabold text-slate-500 text-sm">Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={onSave}
              disabled={saving}
              className="flex-[2] py-4 rounded-2xl items-center bg-blue-900"
              style={{ shadowColor: "#1e3a8a", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 5 }}
            >
              {saving
                ? <ActivityIndicator color="#fff" />
                : <Text className="font-black text-white text-sm">
                    {editingBus ? "UPDATE VEHICLE" : "SAVE VEHICLE"}
                  </Text>
              }
            </TouchableOpacity>
          </View>
        </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  </Portal>
);

// ─── View bus modal ───────────────────────────────────────────────────────────
const ViewBusModal = ({ visible, bus, onClose }) => {
  if (!bus) return null;
  const form = itemToForm(bus);
  const amenities = parseAmenities(bus.amenities);

  return (
    <Portal>
      <Modal
        visible={visible}
        onDismiss={onClose}
        contentContainerStyle={{
          backgroundColor: "#fff", margin: 14, borderRadius: 24, maxHeight: "92%",
        }}
      >
        <View style={{ flex: 1 }}>
          {/* Modal header */}
          <View className="flex-row items-center justify-between px-5 pt-5 pb-4 border-b border-slate-100">
            <View>
              <Text className="text-lg font-black text-slate-900">View Vehicle</Text>
              <Text className="text-xs text-slate-400 mt-0.5">Details for {bus.bus_number}</Text>
            </View>
            <TouchableOpacity
              onPress={onClose}
              className="w-9 h-9 bg-slate-100 rounded-xl items-center justify-center"
            >
              <Ionicons name="close" size={17} color="#64748b" />
            </TouchableOpacity>
          </View>

          <ScrollView
            style={{ flex: 1 }}
            contentContainerStyle={{ paddingBottom: 30 }}
            className="px-5"
            showsVerticalScrollIndicator={false}
          >
            {/* Basic info */}
            <SectionLabel>Basic Information</SectionLabel>
            <View className="mb-3">
              <Text className="text-xs font-bold text-slate-500 mb-1">Bus Number</Text>
              <Text className="text-sm font-semibold text-slate-900">{form.bus_number}</Text>
            </View>
            <View className="mb-3">
              <Text className="text-xs font-bold text-slate-500 mb-1">Registration Number</Text>
              <Text className="text-sm font-semibold text-slate-900">{form.registration_number}</Text>
            </View>
            <View className="mb-3">
              <Text className="text-xs font-bold text-slate-500 mb-1">License Plate</Text>
              <Text className="text-sm font-semibold text-slate-900">{form.license_plate || "—"}</Text>
            </View>

            {/* Type & Status */}
            <SectionLabel>Bus Type</SectionLabel>
            <View className="mb-3">
              <Text className="text-sm font-semibold text-slate-900">{form.bus_type}</Text>
            </View>

            <SectionLabel>Status</SectionLabel>
            <View className="mb-3">
              <Text className="text-sm font-semibold text-slate-900">{form.status}</Text>
            </View>

            {/* Capacity */}
            <SectionLabel>Seating Capacity</SectionLabel>
            <View className="flex-row gap-2 mb-3">
              <View className="flex-1">
                <Text className="text-xs font-bold text-slate-500 mb-1">Seats</Text>
                <Text className="text-sm font-semibold text-slate-900">{form.total_seats}</Text>
              </View>
              <View className="flex-1">
                <Text className="text-xs font-bold text-slate-500 mb-1">Rows</Text>
                <Text className="text-sm font-semibold text-slate-900">{form.seat_rows}</Text>
              </View>
              <View className="flex-1">
                <Text className="text-xs font-bold text-slate-500 mb-1">Cols</Text>
                <Text className="text-sm font-semibold text-slate-900">{form.seat_columns}</Text>
              </View>
            </View>
            <View className="mb-3">
              <Text className="text-xs font-bold text-slate-500 mb-1">Layout</Text>
              <Text className="text-sm font-semibold text-slate-900">{form.seat_layout_type}</Text>
            </View>

            {/* Amenities */}
            <SectionLabel>Amenities</SectionLabel>
            <View className="flex-row flex-wrap gap-2 mb-3">
              {amenities.length > 0 ? amenities.map((a) => (
                <View key={a} className="bg-blue-100 px-2 py-1 rounded-md">
                  <Text className="text-xs font-extrabold text-blue-700">{a}</Text>
                </View>
              )) : <Text className="text-sm text-slate-500">None</Text>}
            </View>

            {/* Vehicle details */}
            <SectionLabel>Vehicle Details</SectionLabel>
            <View className="flex-row gap-2 mb-3">
              <View className="flex-1">
                <Text className="text-xs font-bold text-slate-500 mb-1">Manufacturer</Text>
                <Text className="text-sm font-semibold text-slate-900">{form.manufacturer || "—"}</Text>
              </View>
              <View className="flex-1">
                <Text className="text-xs font-bold text-slate-500 mb-1">Model</Text>
                <Text className="text-sm font-semibold text-slate-900">{form.model || "—"}</Text>
              </View>
            </View>
            <View className="flex-row gap-2 mb-3">
              <View className="flex-1">
                <Text className="text-xs font-bold text-slate-500 mb-1">Year</Text>
                <Text className="text-sm font-semibold text-slate-900">{form.year || "—"}</Text>
              </View>
              <View className="flex-1">
                <Text className="text-xs font-bold text-slate-500 mb-1">Color</Text>
                <Text className="text-sm font-semibold text-slate-900">{form.color || "—"}</Text>
              </View>
            </View>

            {/* Compliance */}
            <SectionLabel>Compliance &amp; Expiry</SectionLabel>
            <View className="mb-3">
              <Text className="text-xs font-bold text-slate-500 mb-1">Insurance Expiry</Text>
              <Text className="text-sm font-semibold text-slate-900">{form.insurance_expiry || "—"}</Text>
            </View>
            <View className="mb-3">
              <Text className="text-xs font-bold text-slate-500 mb-1">Fitness Expiry</Text>
              <Text className="text-sm font-semibold text-slate-900">{form.fitness_expiry || "—"}</Text>
            </View>

            {/* Notes */}
            <SectionLabel>Notes</SectionLabel>
            <View className="mb-3">
              <Text className="text-sm font-semibold text-slate-900">{form.notes || "—"}</Text>
            </View>

            {/* Close button */}
            <View className="flex-row gap-3 mt-4 mb-10">
              <TouchableOpacity
                onPress={onClose}
                className="flex-1 py-4 rounded-2xl items-center bg-slate-100 border border-slate-200"
              >
                <Text className="font-extrabold text-slate-500 text-sm">Close</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>
      </Modal>
    </Portal>
  );
};

// ─── Main screen ──────────────────────────────────────────────────────────────
export default function AdminBuses() {
  const {
    buses,
    loading:    loadingStates,
    refreshing: refreshingStates,
    getPagination,
    updatePagination,
    getSearchQuery,
    updateSearchQuery,
    fetchBuses,
  } = useAdminData();

  const loading    = loadingStates.buses;
  const refreshing = refreshingStates.buses;
  const { page, limit, total: totalItems } = getPagination("buses");
  const searchQuery = getSearchQuery("buses");

  const [searchInput,    setSearchInput]    = useState(searchQuery);
  const [modalVisible,   setModalVisible]   = useState(false);
  const [exportModalVisible, setExportModalVisible] = useState(false);
  const [viewModalVisible, setViewModalVisible] = useState(false);
  const [editingBus,     setEditingBus]     = useState(null);
  const [viewingBus,     setViewingBus]     = useState(null);
  const [saving,         setSaving]         = useState(false);
  const [deleting,       setDeleting]       = useState(false);
  const [exporting,      setExporting]      = useState(false);
  const [form,           setForm]           = useState({ ...EMPTY_FORM });
  const debounceRef = useRef(null);
  const normalizedBuses = buses.map(normalizeBus);

  useEffect(() => { fetchBuses(); }, [page, limit, searchQuery]);

  const commitSearch = useCallback(
    (text) => updateSearchQuery("buses", text),
    [updateSearchQuery],
  );

  const handleSearch = (text) => {
    setSearchInput(text);
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => commitSearch(text), 500);
  };

  const openCreate = () => { setEditingBus(null); setForm({ ...EMPTY_FORM }); setModalVisible(true); };
  const openEdit   = (item) => { setEditingBus(item); setForm(itemToForm(item)); setModalVisible(true); };
  const openView   = (item) => { setViewingBus(item); setViewModalVisible(true); };

  const handleSave = async () => {
    if (!form.bus_number.trim() || !form.registration_number.trim())
      return Alert.alert("Required", "Bus Number and Registration Number are required.");
    setSaving(true);
    try {
      editingBus
        ? await updateBus(editingBus.id, toPayload(form))
        : await createBus(toPayload(form));
      setModalVisible(false);
      fetchBuses(true);
    } catch {
      Alert.alert("Error", "Could not save. Please try again.");
    } finally { setSaving(false); }
  };

  const handleDelete = (id, name) => {
    if (!id) {
      Alert.alert("Error", "Invalid bus ID. Cannot delete.");
      return;
    }
    Alert.alert("Remove Vehicle", `Delete "${name}" from the fleet?`, [
      { text: "Cancel", style: "cancel" },
      { 
        text: "Delete", 
        style: "destructive", 
        onPress: async () => {
          setDeleting(true);
          try {
            console.log(`Deleting bus with ID: ${id}`);
            const response = await deleteBus(id);
            console.log("Delete response:", response);
            
            Alert.alert("Success", "Bus deleted successfully.", [
              { 
                text: "OK", 
                onPress: () => {
                  setDeleting(false);
                  fetchBuses(true);
                }
              }
            ]);
          } catch (error) {
            setDeleting(false);
            console.error("Delete error:", error);
            const errorMessage = error.response?.data?.message || error.message || "Could not delete the bus. Please try again.";
            Alert.alert("Error", errorMessage);
          }
        } 
      },
    ]);
  };

  const handleExport = async (type) => {
    setExportModalVisible(false);   // Close the export modal first
    setExporting(true);
    try {
      if (type === "csv") await exportCSV(normalizedBuses);
      if (type === "pdf") await exportPDF(normalizedBuses);
    } catch (e) {
      Alert.alert("Export Failed", e.message || "Something went wrong.");
    } finally { setExporting(false); }
  };

  const totalPages = Math.ceil(totalItems / limit) || 1;

  return (
    <SafeAreaView style={{ flex: 1 }} className=" bg-slate-50">
      <StatusBar barStyle="light-content" backgroundColor="#1e3a8a" />

      {/* ── Header ────────────────────────────────────────── */}
      <View className="bg-blue-900 px-4 pt-4 pb-4">
        <View className="flex-row items-center justify-between mb-3">

          {/* Title */}
          <View>
            <Text className="text-xl font-black text-white tracking-tight">Fleet Manager</Text>
            <Text className="text-xs text-blue-300 font-semibold mt-0.5">
              {totalItems} vehicle{totalItems !== 1 ? "s" : ""} registered
            </Text>
          </View>

          {/* Actions */}
          <View className="flex-row items-center gap-2">

            {/* Export button */}
            <TouchableOpacity
              onPress={() => setExportModalVisible(true)}
              disabled={exporting || buses.length === 0}
              className="w-11 h-11 rounded-xl items-center justify-center"
              style={{ backgroundColor: "rgba(255,255,255,0.15)" }}
            >
              {exporting
                ? <ActivityIndicator size="small" color="#fff" />
                : <Ionicons name="share-outline" size={20} color="#fff" />
              }
            </TouchableOpacity>

            {/* Add Bus */}
            <TouchableOpacity
              onPress={openCreate}
              className="flex-row items-center gap-1.5 bg-white px-4 h-11 rounded-xl"
            >
              <Ionicons name="add-circle" size={17} color="#1e3a8a" />
              <Text className="font-black text-blue-900 text-xs">ADD BUS</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Search */}
        <Searchbar
          placeholder="Search bus number, type, registration..."
          onChangeText={handleSearch}
          value={searchInput}
          elevation={0}
          style={{ backgroundColor: "rgba(255,255,255,0.12)", borderRadius: 14, height: 46 }}
          inputStyle={{ fontSize: 13, fontWeight: "600", color: "#fff" }}
          placeholderTextColor="rgba(255,255,255,0.4)"
          iconColor="rgba(255,255,255,0.6)"
        />
      </View>

      {/* ── Bus list ──────────────────────────────────────── */}
      {loading && !refreshing ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color="#1e3a8a" size="large" />
          <Text className="mt-3 text-slate-400 font-bold text-sm">Loading fleet...</Text>
        </View>
      ) : (
        <FlatList
          style={{ flex: 1 }}
          data={normalizedBuses}
          keyExtractor={(item) => item.id?.toString() ?? item._id}
          renderItem={({ item, index }) => (
            <BusCard item={item} index={index} onEdit={openEdit} onDelete={handleDelete} onView={openView} />
          )}
          contentContainerStyle={{ flexGrow: 1, paddingTop: 14, paddingBottom: 24 }}
          showsVerticalScrollIndicator={false}
          nestedScrollEnabled={true}
          keyboardShouldPersistTaps="handled"
          ListHeaderComponent={
            <View className="bg-white flex-row border-b border-slate-100">
              {[
                { label: "Total",       val: totalItems,                                                       tw: "text-blue-900"   },
                { label: "Active",      val: normalizedBuses.filter((b) => b.status === "active").length,       tw: "text-green-600"  },
                { label: "Inactive",    val: normalizedBuses.filter((b) => b.status === "inactive").length,     tw: "text-red-600"    },
                { label: "Maintenance", val: normalizedBuses.filter((b) => b.status === "maintenance").length,  tw: "text-yellow-600" },
              ].map(({ label, val, tw }, i, arr) => (
                <View
                  key={label}
                  className={`flex-1 items-center py-3 ${i < arr.length - 1 ? "border-r border-slate-100" : ""}`}
                >
                  <Text className={`text-xl font-black ${tw}`}>{val}</Text>
                  <Text className="text-[9px] text-slate-400 font-bold uppercase tracking-wider mt-0.5">{label}</Text>
                </View>
              ))}
            </View>
          }
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => fetchBuses(true)}
              tintColor="#1e3a8a"
              colors={["#1e3a8a"]}
            />
          }

          ListEmptyComponent={() => (
            <View className="items-center pt-24 px-10">
              <MaterialCommunityIcons name="bus-alert" size={72} color="#e2e8f0" />
              <Text className="mt-4 text-slate-400 font-extrabold text-base text-center">
                {searchQuery ? `No results for "${searchQuery}"` : "No Vehicles Found"}
              </Text>
              {!searchQuery && (
                <TouchableOpacity
                  onPress={openCreate}
                  className="mt-5 flex-row items-center gap-2 bg-blue-900 px-6 py-3 rounded-2xl"
                >
                  <Ionicons name="add" size={16} color="#fff" />
                  <Text className="text-white font-black text-sm">Add First Bus</Text>
                </TouchableOpacity>
              )}
            </View>
          )}

          ListFooterComponent={() =>
            buses.length > 0 ? (
              <View className="mx-3 mt-1 mb-6">
                <View className="flex-row items-center justify-between bg-white rounded-2xl px-4 py-3 border border-slate-100">
                  <Text className="text-xs text-slate-400 font-bold">
                    Page {page} / {totalPages} · {buses.length} of {totalItems}
                  </Text>
                  <View className="flex-row gap-2">
                    <TouchableOpacity
                      disabled={page <= 1}
                      onPress={() => updatePagination("buses", { page: page - 1 })}
                      className={`px-4 py-2 rounded-xl border ${
                        page <= 1 ? "bg-slate-50 border-slate-200" : "bg-blue-900 border-blue-900"
                      }`}
                    >
                      <Text className={`text-xs font-extrabold ${page <= 1 ? "text-slate-300" : "text-white"}`}>
                        ← Prev
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      disabled={page >= totalPages}
                      onPress={() => updatePagination("buses", { page: page + 1 })}
                      className={`px-4 py-2 rounded-xl border ${
                        page >= totalPages ? "bg-slate-50 border-slate-200" : "bg-blue-900 border-blue-900"
                      }`}
                    >
                      <Text className={`text-xs font-extrabold ${page >= totalPages ? "text-slate-300" : "text-white"}`}>
                        Next →
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            ) : null
          }
        />
      )}

      {/* ── Form modal ────────────────────────────────────── */}
      <BusForm
        visible={modalVisible}
        editingBus={editingBus}
        form={form}
        setForm={setForm}
        saving={saving}
        onSave={handleSave}
        onClose={() => setModalVisible(false)}
      />

      {/* ── View modal ────────────────────────────────────── */}
      <ViewBusModal
        visible={viewModalVisible}
        bus={viewingBus}
        onClose={() => setViewModalVisible(false)}
      />

      {/* Export modal – replaces the old absolute overlay */}
      <Portal>
        <Modal
          visible={exportModalVisible}
          onDismiss={() => setExportModalVisible(false)}
          contentContainerStyle={{
            backgroundColor: "white",
            marginHorizontal: 40,
            borderRadius: 16,
            padding: 16,
          }}
        >
          <Text className="text-base font-black text-slate-800 mb-3">
            Export Fleet Data
          </Text>
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
          <TouchableOpacity
            onPress={() => setExportModalVisible(false)}
            className="mt-2 items-center py-2"
          >
            <Text className="text-xs font-bold text-slate-400">Cancel</Text>
          </TouchableOpacity>
        </Modal>
      </Portal>
    </SafeAreaView>
  );
}