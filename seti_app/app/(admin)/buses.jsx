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
import { createBus, deleteBus, updateBus, getBusById, getAllBusesForExport } from "../../api/buses";
import { useAdminData } from "../../context/AdminContext";
import PdfViewer from "../../components/PdfViewer";

const BUS_TYPES = ["Luxury", "Standard", "Mini", "Sleeper"];
const STATUSES = ["active", "inactive", "maintenance"];
const AMENITIES = ["AC", "WiFi", "Charging Point", "TV", "Snacks", "Water", "Blanket", "Pillow"];
const PAGE_SIZES = [10, 25, 50, 100];

const normalizeStatus = (status) => status === "retired" ? "inactive" : status;
const normalizeBus = (item) => ({ ...item, status: normalizeStatus(item.status) });

const STATUS_CFG = {
  active: { dot: { backgroundColor: "#22C55E" }, badge: { backgroundColor: "#DCFCE7" }, text: { color: "#15803D" }, label: "ACTIVE" },
  inactive: { dot: { backgroundColor: "#EF4444" }, badge: { backgroundColor: "#FEE2E2" }, text: { color: "#B91C1C" }, label: "INACTIVE" },
  maintenance: { dot: { backgroundColor: "#EAB308" }, badge: { backgroundColor: "#FEF9C3" }, text: { color: "#A16207" }, label: "MAINTENANCE" },
};

const EMPTY_FORM = {
  bus_number: "", registration_number: "", license_plate: "",
  bus_type: "Luxury", status: "active",
  total_seats: "40", seat_rows: "10", seat_columns: "4", seat_layout_type: "2x2",
  amenities: [],
  manufacturer: "", model: "", year: "", color: "",
  insurance_expiry: "", fitness_expiry: "", notes: "",
};

const COLUMNS = [
  { key: "bus_number", label: "Bus No.", sortable: true, flex: 0.9 },
  { key: "registration_number", label: "Registration", sortable: true, flex: 1 },
  { key: "bus_type", label: "Type", sortable: true, flex: 0.7 },
  { key: "total_seats", label: "Seats", sortable: true, flex: 0.5 },
  { key: "status", label: "Status", sortable: true, flex: 1 },
  { key: "created_at", label: "Created", sortable: true, flex: 0.9 },
  { key: "actions", label: "Actions", sortable: false, flex: 1.2 },
];

const parseAmenities = (raw) => {
  if (Array.isArray(raw)) return raw;
  try { return JSON.parse(raw || "[]"); } catch { return []; }
};
const parseSeatLayout = (raw) => {
  try { return JSON.parse(raw || "{}"); } catch { return {}; }
};

const itemToForm = (item) => {
  const sl = parseSeatLayout(item.seat_layout);
  return {
    bus_number: item.bus_number ?? "",
    registration_number: item.registration_number ?? "",
    license_plate: item.license_plate ?? "",
    bus_type: item.bus_type ?? "Luxury",
    status: normalizeStatus(item.status ?? "active"),
    total_seats: String(item.total_seats ?? 40),
    seat_rows: String(sl.rows ?? 10),
    seat_columns: String(sl.columns ?? 4),
    seat_layout_type: sl.layout ?? "2x2",
    amenities: parseAmenities(item.amenities),
    manufacturer: item.manufacturer ?? "",
    model: item.model ?? "",
    year: item.year ? String(item.year) : "",
    color: item.color ?? "",
    insurance_expiry: item.insurance_expiry ? item.insurance_expiry.split("T")[0] : "",
    fitness_expiry: item.fitness_expiry ? item.fitness_expiry.split("T")[0] : "",
    notes: item.notes ?? "",
  };
};

const toPayload = (f) => ({
  bus_number: f.bus_number,
  registration_number: f.registration_number,
  license_plate: f.license_plate || null,
  bus_type: f.bus_type,
  status: f.status === "inactive" ? "retired" : f.status,
  total_seats: parseInt(f.total_seats) || 40,
  seat_layout: {
    rows: parseInt(f.seat_rows) || 10,
    columns: parseInt(f.seat_columns) || 4,
    layout: f.seat_layout_type || "2x2",
  },
  amenities: f.amenities,
  manufacturer: f.manufacturer || null,
  model: f.model || null,
  year: f.year ? parseInt(f.year) : null,
  color: f.color || null,
  insurance_expiry: f.insurance_expiry || null,
  fitness_expiry: f.fitness_expiry || null,
  notes: f.notes || null,
});

const formatDate = (d) => {
  if (!d) return "—";
  const dt = new Date(d);
  if (isNaN(dt.getTime())) return "—";
  return dt.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
};

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
<h1>Fleet Report</h1>
<p>Generated: ${new Date().toLocaleString()} \u00B7 ${buses.length} vehicles</p>
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
      <td>${b.license_plate || "\u2014"}</td>
      <td>${b.bus_type}</td>
      <td><span class="badge ${b.status}">${b.status}</span></td>
      <td>${b.total_seats}</td>
      <td>${parseAmenities(b.amenities).join(", ") || "\u2014"}</td>
      <td>${[b.manufacturer, b.model].filter(Boolean).join(" ") || "\u2014"}</td>
      <td>${b.year || "\u2014"}</td>
      <td>${b.insurance_expiry?.split("T")[0] || "\u2014"}</td>
      <td>${b.fitness_expiry?.split("T")[0] || "\u2014"}</td>
    </tr>`).join("")}
  </tbody>
</table></body></html>`;

const buildCSV = (buses) => {
  const H = ["ID", "Bus Number", "Registration", "License", "Type", "Status", "Seats",
    "Amenities", "Manufacturer", "Model", "Year", "Color", "Ins. Expiry", "Fit. Expiry", "Notes"];
  const E = (v) => `"${String(v ?? "").replace(/"/g, '""')}"`;
  const rows = buses.map((b) => [
    b.id, b.bus_number, b.registration_number, b.license_plate,
    b.bus_type, b.status, b.total_seats, parseAmenities(b.amenities).join("; "),
    b.manufacturer, b.model, b.year, b.color,
    b.insurance_expiry?.split("T")[0], b.fitness_expiry?.split("T")[0], b.notes,
  ].map(E).join(","));
  return [H.map(E).join(","), ...rows].join("\r\n");
};

const buildXLS = (buses) => {
  const headers = ["ID", "Bus Number", "Registration", "License", "Type", "Status", "Seats",
    "Amenities", "Manufacturer", "Model", "Year", "Color", "Ins. Expiry", "Fit. Expiry", "Notes"];
  const rows = buses.map((b) => [
    b.id, b.bus_number, b.registration_number, b.license_plate || "",
    b.bus_type, b.status, b.total_seats, parseAmenities(b.amenities).join(", "),
    b.manufacturer || "", b.model || "", b.year || "", b.color || "",
    b.insurance_expiry?.split("T")[0] || "", b.fitness_expiry?.split("T")[0] || "", b.notes || "",
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
 <Worksheet ss:Name="Fleet">
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

const exportCSV = async (buses) => {
  const csv = buildCSV(buses);
  if (Platform.OS === "web") {
    downloadBlob(new Blob([csv], { type: "text/csv;charset=utf-8;" }), `fleet_${Date.now()}.csv`);
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
    } catch { /* fallback */ }
    await Print.printAsync({ html });
    return;
  }
  const { uri } = await Print.printToFileAsync({ html });
  await shareFile(uri, "application/pdf", "Export PDF");
};

const exportXLS = async (buses) => {
  const xls = buildXLS(buses);
  if (Platform.OS === "web") {
    downloadBlob(new Blob([xls], { type: "application/vnd.ms-excel;charset=utf-8" }), `fleet_${Date.now()}.xls`);
    return;
  }
  const path = `${FileSystem.cacheDirectory}fleet_${Date.now()}.xls`;
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
        opt === "active" ? { backgroundColor: "#16A34A", borderColor: "#16A34A" }
          : opt === "inactive" ? { backgroundColor: "#DC2626", borderColor: "#DC2626" }
            : opt === "maintenance" ? { backgroundColor: "#EAB308", borderColor: "#EAB308" }
              : { backgroundColor: "#1E3A8A", borderColor: "#1E3A8A" };
      return (
        <TouchableOpacity key={opt} onPress={() => onChange(opt)}
          style={[styles.pill, on ? activeBg : styles.pillInactive]}>
          <Text style={[styles.pillText, on ? styles.pillTextActive : styles.pillTextInactive]}>{opt}</Text>
        </TouchableOpacity>
      );
    })}
  </View>
);

const AmenityPicker = ({ selected, onChange }) => {
  const toggle = (a) => onChange(selected.includes(a) ? selected.filter((x) => x !== a) : [...selected, a]);
  return (
    <View style={styles.pillRowContainer}>
      {AMENITIES.map((a) => {
        const on = selected.includes(a);
        return (
          <TouchableOpacity key={a} onPress={() => toggle(a)}
            style={[styles.amenityChip, on ? styles.amenityChipActive : styles.amenityChipInactive]}>
            {on && <Ionicons name="checkmark-circle" size={11} color="#2563eb" />}
            <Text style={[styles.amenityChipText, on ? styles.amenityChipTextActive : styles.amenityChipTextInactive]}>{a}</Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
};

const StatusBadge = ({ status }) => {
  const s = STATUS_CFG[status] ?? STATUS_CFG.inactive;
  return (
    <View style={[styles.statusBadgeContainer, s.badge]}>
      <View style={[styles.statusDot, s.dot]} />
      <Text style={[styles.statusLabel, s.text]}>{s.label}</Text>
    </View>
  );
};

const BusForm = ({ visible, editingBus, form, setForm, formErrors, clearFieldError, saving, onSave, onClose }) => {
  const clr = (f) => (v) => { if (clearFieldError) clearFieldError(f); setForm({ ...form, [f]: v }); };
  return (
  <Portal>
    <Modal visible={visible} onDismiss={onClose} contentContainerStyle={styles.modalContent}>
      <KeyboardAvoidingView style={styles.flex1} behavior={Platform.OS === "ios" ? "padding" : "height"}>
        <View style={styles.flex1}>
          <View style={styles.modalHeader}>
            <View>
              <Text style={styles.modalTitle}>{editingBus ? "Edit Vehicle" : "Register Vehicle"}</Text>
              <Text style={styles.modalSubtitle}>{editingBus ? `Updating ${editingBus.bus_number}` : "Add a new bus to your fleet"}</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Ionicons name="close" size={17} color="#64748b" />
            </TouchableOpacity>
          </View>
          <ScrollView style={styles.flex1} contentContainerStyle={{ paddingBottom: 30, paddingHorizontal: 20 }}
            showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
            <SectionLabel>Basic Information</SectionLabel>
            <Field label="Bus Number *" value={form.bus_number} error={formErrors?.bus_number} onChangeText={clr("bus_number")} />
            <Field label="Registration Number *" value={form.registration_number} error={formErrors?.registration_number} onChangeText={clr("registration_number")} />
            <Field label="License Plate" value={form.license_plate} error={formErrors?.license_plate} onChangeText={clr("license_plate")} />
            <SectionLabel>Bus Type</SectionLabel>
            <PillRow options={BUS_TYPES} value={form.bus_type} onChange={(v) => setForm({ ...form, bus_type: v })} />
            <SectionLabel>Status</SectionLabel>
            <PillRow options={STATUSES} value={form.status} onChange={(v) => setForm({ ...form, status: v })} />
            <SectionLabel>Seating Capacity</SectionLabel>
            <View style={styles.formRow}>
              <View style={styles.formRowItem}><Field label="Seats" value={form.total_seats} error={formErrors?.total_seats} onChangeText={clr("total_seats")} keyboardType="numeric" /></View>
              <View style={styles.formRowItem}><Field label="Rows" value={form.seat_rows} error={formErrors?.seat_rows} onChangeText={clr("seat_rows")} keyboardType="numeric" /></View>
              <View style={styles.formRowItem}><Field label="Cols" value={form.seat_columns} error={formErrors?.seat_columns} onChangeText={clr("seat_columns")} keyboardType="numeric" /></View>
            </View>
            <Field label="Layout (e.g. 2x2)" value={form.seat_layout_type} error={formErrors?.seat_layout_type} onChangeText={clr("seat_layout_type")} />
            <SectionLabel>Amenities</SectionLabel>
            <AmenityPicker selected={form.amenities} onChange={(a) => setForm({ ...form, amenities: a })} />
            <SectionLabel>Vehicle Details</SectionLabel>
            <View style={styles.formRow}>
              <View style={styles.formRowItem}><Field label="Manufacturer" value={form.manufacturer} error={formErrors?.manufacturer} onChangeText={clr("manufacturer")} /></View>
              <View style={styles.formRowItem}><Field label="Model" value={form.model} error={formErrors?.model} onChangeText={clr("model")} /></View>
            </View>
            <View style={styles.formRow}>
              <View style={styles.formRowItem}><Field label="Year" value={form.year} error={formErrors?.year} onChangeText={clr("year")} keyboardType="numeric" /></View>
              <View style={styles.formRowItem}><Field label="Color" value={form.color} error={formErrors?.color} onChangeText={clr("color")} /></View>
            </View>
            <SectionLabel>Compliance &amp; Expiry</SectionLabel>
            <DatePicker label="Insurance Expiry" value={form.insurance_expiry} error={formErrors?.insurance_expiry} onChange={(date) => setForm({ ...form, insurance_expiry: date })} />
            <DatePicker label="Fitness Expiry" value={form.fitness_expiry} error={formErrors?.fitness_expiry} onChange={(date) => setForm({ ...form, fitness_expiry: date })} minDate={form.insurance_expiry || undefined} />
            <SectionLabel>Notes</SectionLabel>
            <Field label="Additional notes\u2026" value={form.notes} error={formErrors?.notes} onChangeText={clr("notes")} multiline numberOfLines={3} />
            <View style={styles.formActions}>
              <TouchableOpacity onPress={onClose} style={styles.cancelBtn}><Text style={styles.cancelBtnText}>Cancel</Text></TouchableOpacity>
              <TouchableOpacity onPress={onSave} disabled={saving} style={styles.saveBtn}>
                {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.saveBtnText}>{editingBus ? "UPDATE VEHICLE" : "SAVE VEHICLE"}</Text>}
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  </Portal>
  );
};

const ViewBusModal = ({ visible, bus, onClose }) => {
  if (!bus) return null;
  const form = itemToForm(bus);
  const amenities = parseAmenities(bus.amenities);
  return (
    <Portal>
      <Modal visible={visible} onDismiss={onClose} contentContainerStyle={styles.modalContent}>
        <View style={styles.flex1}>
          <View style={styles.modalHeader}>
            <View>
              <Text style={styles.modalTitle}>View Vehicle</Text>
              <Text style={styles.modalSubtitle}>Details for {bus.bus_number}</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Ionicons name="close" size={17} color="#64748b" />
            </TouchableOpacity>
          </View>
          <ScrollView style={styles.flex1} contentContainerStyle={{ paddingBottom: 30, paddingHorizontal: 20 }} showsVerticalScrollIndicator={false}>
            <SectionLabel>Basic Information</SectionLabel>
            <View style={styles.viewField}><Text style={styles.viewFieldLabel}>Bus Number</Text><Text style={styles.viewFieldValue}>{form.bus_number}</Text></View>
            <View style={styles.viewField}><Text style={styles.viewFieldLabel}>Registration Number</Text><Text style={styles.viewFieldValue}>{form.registration_number}</Text></View>
            <View style={styles.viewField}><Text style={styles.viewFieldLabel}>License Plate</Text><Text style={styles.viewFieldValue}>{form.license_plate || "\u2014"}</Text></View>
            <SectionLabel>Bus Type</SectionLabel>
            <View style={styles.viewField}><Text style={styles.viewFieldValue}>{form.bus_type}</Text></View>
            <SectionLabel>Status</SectionLabel>
            <View style={styles.viewField}><StatusBadge status={form.status} /></View>
            <SectionLabel>Seating Capacity</SectionLabel>
            <View style={styles.formRow}>
              <View style={styles.formRowItem}><Text style={styles.viewFieldLabel}>Seats</Text><Text style={styles.viewFieldValue}>{form.total_seats}</Text></View>
              <View style={styles.formRowItem}><Text style={styles.viewFieldLabel}>Rows</Text><Text style={styles.viewFieldValue}>{form.seat_rows}</Text></View>
              <View style={styles.formRowItem}><Text style={styles.viewFieldLabel}>Cols</Text><Text style={styles.viewFieldValue}>{form.seat_columns}</Text></View>
            </View>
            <View style={styles.viewField}><Text style={styles.viewFieldLabel}>Layout</Text><Text style={styles.viewFieldValue}>{form.seat_layout_type}</Text></View>
            <SectionLabel>Amenities</SectionLabel>
            <View style={styles.amenityListView}>
              {amenities.length > 0 ? amenities.map((a) => (
                <View key={a} style={styles.amenityChipSmallView}><Text style={styles.amenityChipSmallTextView}>{a}</Text></View>
              )) : <Text style={{ fontSize: 12, color: "#64748B" }}>None</Text>}
            </View>
            <SectionLabel>Vehicle Details</SectionLabel>
            <View style={styles.formRow}>
              <View style={styles.formRowItem}><Text style={styles.viewFieldLabel}>Manufacturer</Text><Text style={styles.viewFieldValue}>{form.manufacturer || "\u2014"}</Text></View>
              <View style={styles.formRowItem}><Text style={styles.viewFieldLabel}>Model</Text><Text style={styles.viewFieldValue}>{form.model || "\u2014"}</Text></View>
            </View>
            <View style={styles.formRow}>
              <View style={styles.formRowItem}><Text style={styles.viewFieldLabel}>Year</Text><Text style={styles.viewFieldValue}>{form.year || "\u2014"}</Text></View>
              <View style={styles.formRowItem}><Text style={styles.viewFieldLabel}>Color</Text><Text style={styles.viewFieldValue}>{form.color || "\u2014"}</Text></View>
            </View>
            <SectionLabel>Compliance &amp; Expiry</SectionLabel>
            <View style={styles.viewField}><Text style={styles.viewFieldLabel}>Insurance Expiry</Text><Text style={styles.viewFieldValue}>{form.insurance_expiry || "\u2014"}</Text></View>
            <View style={styles.viewField}><Text style={styles.viewFieldLabel}>Fitness Expiry</Text><Text style={styles.viewFieldValue}>{form.fitness_expiry || "\u2014"}</Text></View>
            <SectionLabel>Notes</SectionLabel>
            <View style={styles.viewField}><Text style={styles.viewFieldValue}>{form.notes || "\u2014"}</Text></View>
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

export default function AdminBuses() {
  const {
    buses,
    loading: loadingStates,
    refreshing: refreshingStates,
    getPagination,
    updatePagination,
    getSearchQuery,
    updateSearchQuery,
    getSort,
    updateSort,
    fetchBuses,
  } = useAdminData();

  const loading = loadingStates.buses;
  const refreshing = refreshingStates.buses;
  const { page, limit, total: totalItems } = getPagination("buses");
  const searchQuery = getSearchQuery("buses");
  const { sortBy, sortOrder } = getSort("buses");

  const [searchInput, setSearchInput] = useState(searchQuery);
  const [modalVisible, setModalVisible] = useState(false);
  const [exportModalVisible, setExportModalVisible] = useState(false);
  const [viewModalVisible, setViewModalVisible] = useState(false);
  const [pdfModalVisible, setPdfModalVisible] = useState(false);
  const [pdfUri, setPdfUri] = useState(null);
  const [editingBus, setEditingBus] = useState(null);
  const [viewingBus, setViewingBus] = useState(null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [exportRange, setExportRange] = useState("page");
  const [pageSizeModalVisible, setPageSizeModalVisible] = useState(false);
  const [form, setForm] = useState({ ...EMPTY_FORM });
  const [formErrors, setFormErrors] = useState({});
  const debounceRef = useRef(null);
  const normalizedBuses = buses.map(normalizeBus);

  useEffect(() => { fetchBuses(); }, [page, limit, searchQuery, sortBy, sortOrder]);

  const commitSearch = useCallback((text) => updateSearchQuery("buses", text), [updateSearchQuery]);

  const handleSearch = (text) => {
    setSearchInput(text);
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => commitSearch(text), 500);
  };

  const handleSort = (column) => {
    if (!column.sortable) return;
    const currentSort = getSort("buses");
    if (currentSort.sortBy === column.key) {
      updateSort("buses", column.key, currentSort.sortOrder === "ASC" ? "DESC" : "ASC");
    } else {
      updateSort("buses", column.key, "ASC");
    }
  };

  const handlePageSizeChange = (newSize) => {
    updatePagination("buses", { limit: newSize, page: 1 });
    setPageSizeModalVisible(false);
  };

  const openCreate = () => { setEditingBus(null); setForm({ ...EMPTY_FORM }); setFormErrors({}); setModalVisible(true); };
  const openEdit = (item) => { setEditingBus(item); setForm(itemToForm(item)); setFormErrors({}); setModalVisible(true); };
  const openView = (item) => { setViewingBus(item); setViewModalVisible(true); };

  const validateForm = () => {
    const errors = {};
    if (!form.bus_number.trim()) errors.bus_number = "Bus number is required";
    if (!form.registration_number.trim()) errors.registration_number = "Registration number is required";
    if (!form.total_seats || parseInt(form.total_seats) < 1) errors.total_seats = "Valid seat count required (1-80)";
    if (parseInt(form.total_seats) > 80) errors.total_seats = "Maximum 80 seats allowed";
    if (form.year && (isNaN(parseInt(form.year)) || parseInt(form.year) < 1990 || parseInt(form.year) > new Date().getFullYear()))
      errors.year = "Year must be between 1990 and " + new Date().getFullYear();
    if (form.insurance_expiry && isNaN(new Date(form.insurance_expiry).getTime()))
      errors.insurance_expiry = "Invalid insurance expiry date";
    if (form.fitness_expiry && isNaN(new Date(form.fitness_expiry).getTime()))
      errors.fitness_expiry = "Invalid fitness expiry date";
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
      editingBus ? await updateBus(editingBus.id, toPayload(form)) : await createBus(toPayload(form));
      setModalVisible(false);
      setFormErrors({});
      Alert.alert("Success", editingBus ? "Bus updated successfully!" : "New bus added successfully!", [
        { text: "OK", onPress: () => fetchBuses(true) },
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
    }
    finally { setSaving(false); }
  };

  const handleDelete = (id, name) => {
    if (!id) { Alert.alert("Error", "Invalid bus ID. Cannot delete."); return; }
    Alert.alert("Remove Vehicle", `Delete "${name}" from the fleet?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete", style: "destructive", onPress: async () => {
          setDeleting(true);
          try {
            await deleteBus(id);
            Alert.alert("Success", "Bus deleted successfully.", [{ text: "OK", onPress: () => { setDeleting(false); fetchBuses(true); } }]);
          } catch (error) {
            setDeleting(false);
            Alert.alert("Error", error.response?.data?.message || error.message || "Could not delete the bus.");
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
        ? (await getAllBusesForExport()).data.data?.buses || normalizedBuses
        : normalizedBuses;
      const allBuses = exportData.map(normalizeBus);
      if (type === "csv") await exportCSV(allBuses);
      if (type === "pdf") await exportPDF(allBuses);
      if (type === "xls") await exportXLS(allBuses);
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
    const current = getSort("buses");
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
          <Text style={styles.cellBusNumber} numberOfLines={1}>{item.bus_number}</Text>
        </View>
        <View style={[styles.tableCell, { flex: COLUMNS[1].flex }]}>
          <Text style={styles.cellText} numberOfLines={1}>{item.registration_number}</Text>
        </View>
        <View style={[styles.tableCell, { flex: COLUMNS[2].flex }]}>
          <Text style={styles.cellType} numberOfLines={1}>{item.bus_type}</Text>
        </View>
        <View style={[styles.tableCell, { flex: COLUMNS[3].flex }]}>
          <Text style={styles.cellText}>{item.total_seats}</Text>
        </View>
        <View style={[styles.tableCell, { flex: COLUMNS[4].flex }]}>
          <StatusBadge status={item.status} />
        </View>
        <View style={[styles.tableCell, { flex: COLUMNS[5].flex }]}>
          <Text style={styles.cellDate}>{formatDate(item.created_at)}</Text>
        </View>
        <View style={[styles.tableCell, { flex: COLUMNS[6].flex, flexDirection: "row", gap: 4 }]}>
          <TouchableOpacity onPress={() => openView(item)} style={styles.actionBtn}>
            <Ionicons name="eye-outline" size={13} color="#1e3a8a" />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => openEdit(item)} style={styles.actionBtn}>
            <Ionicons name="pencil-outline" size={13} color="#475569" />
          </TouchableOpacity>
          <TouchableOpacity onPress={async () => {
            try {
              const busDetail = await getBusById(item.id);
              const bus = busDetail.data.data.bus;
              const pdfHtml = buildHTML([bus]);
              const { uri } = await Print.printToFileAsync({ html: pdfHtml });
              setPdfUri(uri);
              setPdfModalVisible(true);
            } catch { openView(item); }
          }} style={[styles.actionBtn, { backgroundColor: "#F0FDF4" }]}>
            <Ionicons name="document-text-outline" size={13} color="#16a34a" />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => handleDelete(item.id || item._id, item.bus_number)}
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
            <Text style={styles.headerTitle}>Fleet Manager</Text>
            <Text style={styles.headerCount}>{totalItems} vehicle{totalItems !== 1 ? "s" : ""} registered</Text>
          </View>
          <View style={styles.headerActions}>
            <TouchableOpacity onPress={() => setExportModalVisible(true)}
              disabled={exporting || buses.length === 0} style={styles.exportBtn}>
              {exporting ? <ActivityIndicator size="small" color="#fff" /> : <Ionicons name="share-outline" size={20} color="#fff" />}
            </TouchableOpacity>
            <TouchableOpacity onPress={openCreate} style={styles.addBtn}>
              <Ionicons name="add-circle" size={17} color="#1e3a8a" />
              <Text style={styles.addBtnText}>ADD BUS</Text>
            </TouchableOpacity>
          </View>
        </View>
        <Searchbar
          placeholder="Search bus number, name, type, route..."
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
          <Text style={styles.loadingText}>Loading fleet...</Text>
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
              onRefresh={() => fetchBuses(true)}
              tintColor="#1e3a8a"
              colors={["#1e3a8a"]}
            />
          }
        >
          <View style={styles.statsBar}>
            {[
              { label: "Total", val: totalItems },
              { label: "Active", val: normalizedBuses.filter((b) => b.status === "active").length },
              { label: "Inactive", val: normalizedBuses.filter((b) => b.status === "inactive").length },
              { label: "Maintenance", val: normalizedBuses.filter((b) => b.status === "maintenance").length },
            ].map(({ label, val }, i, arr) => (
              <View key={label} style={[styles.statBox, i < arr.length - 1 && styles.statBoxBorder]}>
                <Text style={[
                  styles.statValue,
                  label === "Active" ? { color: "#16A34A" } :
                    label === "Inactive" ? { color: "#DC2626" } :
                      label === "Maintenance" ? { color: "#CA8A04" } : {}
                ]}>{val}</Text>
                <Text style={styles.statLabel}>{label}</Text>
              </View>
            ))}
          </View>

          <ScrollView horizontal showsHorizontalScrollIndicator={true} style={styles.tableScroll} nestedScrollEnabled={true}>
            <View style={styles.tableContainer}>
              {renderTableHeader()}
              {normalizedBuses.length > 0 ? (
                normalizedBuses.map((item, index) => renderTableRow(item, index))
              ) : (
                <View style={styles.emptyTable}>
                  <MaterialCommunityIcons name="bus-alert" size={48} color="#e2e8f0" />
                  <Text style={styles.emptyText}>
                    {searchQuery ? `No results for "${searchQuery}"` : "No Vehicles Found"}
                  </Text>
                  {!searchQuery && (
                    <TouchableOpacity onPress={openCreate} style={styles.emptyAddBtn}>
                      <Ionicons name="add" size={16} color="#fff" />
                      <Text style={styles.emptyAddBtnText}>Add First Bus</Text>
                    </TouchableOpacity>
                  )}
                </View>
              )}
            </View>
          </ScrollView>

          {normalizedBuses.length > 0 && (
            <View style={styles.footerContainer}>
              <View style={styles.footerRow}>
                <TouchableOpacity onPress={() => setPageSizeModalVisible(true)} style={styles.pageSizeBtn}>
                  <Text style={styles.pageSizeText}>{limit} rows</Text>
                  <Ionicons name="chevron-down" size={12} color="#64748b" />
                </TouchableOpacity>
                <Text style={styles.entriesInfo}>Showing {startEntry} to {endEntry} of {totalItems} entries</Text>
                <View style={styles.pagination}>
                  <TouchableOpacity disabled={page <= 1}
                    onPress={() => updatePagination("buses", { page: page - 1 })}
                    style={[styles.paginationBtn, page <= 1 ? styles.paginationBtnDisabled : styles.paginationBtnActive]}>
                    <Text style={[styles.paginationBtnText, page <= 1 ? styles.paginationTextDisabled : styles.paginationTextActive]}>Prev</Text>
                  </TouchableOpacity>
                  {getPageNumbers().map((p) => (
                    <TouchableOpacity key={p} onPress={() => updatePagination("buses", { page: p })}
                      style={[styles.pageNumBtn, p === page && styles.pageNumBtnActive]}>
                      <Text style={[styles.pageNumText, p === page && styles.pageNumTextActive]}>{p}</Text>
                    </TouchableOpacity>
                  ))}
                  <TouchableOpacity disabled={page >= totalPages}
                    onPress={() => updatePagination("buses", { page: page + 1 })}
                    style={[styles.paginationBtn, page >= totalPages ? styles.paginationBtnDisabled : styles.paginationBtnActive]}>
                    <Text style={[styles.paginationBtnText, page >= totalPages ? styles.paginationTextDisabled : styles.paginationTextActive]}>Next</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          )}
        </ScrollView>
      )}

      <BusForm visible={modalVisible} editingBus={editingBus} form={form}
        setForm={setForm} formErrors={formErrors} clearFieldError={clearFieldError}
        saving={saving} onSave={handleSave} onClose={() => setModalVisible(false)} />

      <ViewBusModal visible={viewModalVisible} bus={viewingBus} onClose={() => setViewModalVisible(false)} />

      <PdfPreviewModal visible={pdfModalVisible} uri={pdfUri} onClose={() => setPdfModalVisible(false)} />

      <Portal>
        <Modal visible={exportModalVisible} onDismiss={() => setExportModalVisible(false)} contentContainerStyle={styles.exportModal}>
          <Text style={styles.exportModalTitle}>Export Fleet Data</Text>
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
  pillRowContainer: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 8 },
  pill: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 9999, borderWidth: 1 },
  pillInactive: { backgroundColor: "#F1F5F9", borderColor: "#E2E8F0" },
  pillText: { fontSize: 10, fontWeight: "800" },
  pillTextActive: { color: "#FFFFFF" },
  pillTextInactive: { color: "#64748B" },
  amenityChip: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16, borderWidth: 1 },
  amenityChipActive: { backgroundColor: "#DBEAFE", borderColor: "#60A5FA" },
  amenityChipInactive: { backgroundColor: "#F8FAFC", borderColor: "#E2E8F0" },
  amenityChipText: { fontSize: 10, fontWeight: "700" },
  amenityChipTextActive: { color: "#1D4ED8" },
  amenityChipTextInactive: { color: "#94A3B8" },
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
  amenityListView: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 12 },
  amenityChipSmallView: { backgroundColor: "#DBEAFE", paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  amenityChipSmallTextView: { fontSize: 10, fontWeight: "800", color: "#1D4ED8" },
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
  tableContainer: { minWidth: 700, paddingHorizontal: 12 },
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
