import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  View, Text, SafeAreaView, ScrollView, TouchableOpacity,
  ActivityIndicator, Alert, RefreshControl,
  KeyboardAvoidingView, Platform, StatusBar, StyleSheet,
} from "react-native";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { Portal, Modal, TextInput, Searchbar } from "react-native-paper";
import * as Print      from "expo-print";
import * as Sharing    from "expo-sharing";
import * as FileSystem from "expo-file-system";
import Animated, { FadeInDown } from "react-native-reanimated";
import { createRoute, deleteRoute, updateRoute, getRoutes } from "../../api/routes";
import { useAdminData } from "../../context/AdminContext";
import PdfViewer from "../../components/PdfViewer";

const STATUSES = ["active", "inactive"];
const PAGE_SIZES = [10, 25, 50, 100];

const normalizeActive = (is_active) => {
  if (typeof is_active === "number") return is_active === 1;
  if (typeof is_active === "boolean") return is_active;
  return is_active === "1" || is_active === "true" || !!is_active;
};

const STATUS_CFG = {
  active: { dot: { backgroundColor: "#22C55E" }, badge: { backgroundColor: "#DCFCE7" }, text: { color: "#15803D" }, label: "ACTIVE" },
  inactive: { dot: { backgroundColor: "#EF4444" }, badge: { backgroundColor: "#FEE2E2" }, text: { color: "#B91C1C" }, label: "INACTIVE" },
};

const EMPTY_FORM = {
  origin: "",
  destination: "",
  distance_km: "",
  duration_minutes: "",
  base_price: "",
  is_active: "active",
  stops: "[]",
  popularity_score: "0",
  description: "",
  route_image: "",
};

const COLUMNS = [
  { key: "route", label: "Route", sortable: true, flex: 1.3 },
  { key: "distance_km", label: "Dist.", sortable: true, flex: 0.7 },
  { key: "duration_minutes", label: "Duration", sortable: true, flex: 0.8 },
  { key: "base_price", label: "Fare", sortable: true, flex: 0.7 },
  { key: "is_active", label: "Status", sortable: true, flex: 0.8 },
  { key: "created_at", label: "Created", sortable: true, flex: 0.9 },
  { key: "actions", label: "Actions", sortable: false, flex: 1.2 },
];

const parseStops = (raw) => {
  if (!raw) return [];
  if (Array.isArray(raw)) return raw;
  try { return JSON.parse(raw); } catch { return []; }
};

const itemToForm = (item) => {
  const isActive = normalizeActive(item.is_active);
  return {
    origin:             item.origin             ?? "",
    destination:        item.destination        ?? "",
    distance_km:        String(item.distance_km ?? ""),
    duration_minutes:   String(item.duration_minutes ?? ""),
    base_price:         String(item.base_price     ?? ""),
    is_active:          isActive ? "active" : "inactive",
    stops:              Array.isArray(item.stops) ? JSON.stringify(item.stops) : (item.stops || "[]"),
    popularity_score:   String(item.popularity_score ?? "0"),
    description:        item.description        ?? "",
    route_image:        item.route_image        ?? "",
  };
};

const toPayload = (f, isUpdate = false) => {
  let stops = [];
  try { stops = JSON.parse(f.stops); } catch { stops = []; }
  if (!Array.isArray(stops)) stops = [];

  const payload = {
    origin: f.origin,
    destination: f.destination,
    base_price: parseFloat(f.base_price),
  };

  const dist = parseFloat(f.distance_km);
  if (!isNaN(dist) && dist > 0) payload.distance_km = dist;

  const dur = parseInt(f.duration_minutes);
  if (!isNaN(dur) && dur > 0) payload.duration_minutes = dur;

  if (f.description) payload.description = f.description;

  if (f.route_image) payload.route_image = f.route_image;

  if (stops.length > 0) {
    payload.stops = stops.map((s) =>
      typeof s === 'string' ? { location: s } : s
    );
  }

  if (isUpdate) {
    payload.is_active = f.is_active === "active";
  }

  return payload;
};

const formatDate = (d) => {
  if (!d) return "\u2014";
  const dt = new Date(d);
  if (isNaN(dt.getTime())) return "\u2014";
  return dt.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
};

const buildHTML = (routes) => `<!DOCTYPE html><html><head><meta charset="utf-8"/>
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
</style></head><body>
<h1>\uD83D\uDDFA\uFE0F Route Report</h1>
<p>Generated: ${new Date().toLocaleString()} \u00B7 ${routes.length} routes</p>
<table>
  <thead><tr>
    <th>#</th><th>Origin</th><th>Destination</th><th>Distance (km)</th><th>Duration (min)</th>
    <th>Base Price</th><th>Active</th><th>Popularity</th><th>Description</th>
  </tr></thead>
  <tbody>
    ${routes.map((r, i) => `<tr>
      <td>${i + 1}</td>
      <td><strong>${r.origin}</strong></td>
      <td>${r.destination}</td>
      <td>${r.distance_km ?? "\u2014"}</td>
      <td>${r.duration_minutes ?? "\u2014"}</td>
      <td>${r.base_price ?? "\u2014"}</td>
      <td><span class="badge ${normalizeActive(r.is_active) ? 'active' : 'inactive'}">${normalizeActive(r.is_active) ? 'Active' : 'Inactive'}</span></td>
      <td>${r.popularity_score ?? 0}</td>
      <td>${r.description || "\u2014"}</td>
    </tr>`).join("")}
  </tbody>
</table></body></html>`;

const buildCSV = (routes) => {
  const H = ["ID", "Origin", "Destination", "Distance (km)", "Duration (min)", "Base Price", "Active", "Stops", "Popularity", "Description", "Image"];
  const E = (v) => `"${String(v ?? "").replace(/"/g, '""')}"`;
  const rows = routes.map((r) => [
    r.id, r.origin, r.destination, r.distance_km, r.duration_minutes,
    r.base_price, normalizeActive(r.is_active) ? "Yes" : "No",
    parseStops(r.stops).join("; ") || "\u2014",
    r.popularity_score, r.description, r.route_image,
  ].map(E).join(","));
  return [H.map(E).join(","), ...rows].join("\r\n");
};

const buildXLS = (routes) => {
  const headers = ["ID", "Origin", "Destination", "Distance (km)", "Duration (min)", "Base Price", "Active", "Stops", "Popularity", "Description", "Image"];
  const rows = routes.map((r) => [
    r.id, r.origin, r.destination, r.distance_km || "", r.duration_minutes || "",
    r.base_price || "", normalizeActive(r.is_active) ? "Yes" : "No",
    parseStops(r.stops).join(", ") || "", r.popularity_score || 0, r.description || "", r.route_image || "",
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
 <Worksheet ss:Name="Routes">
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

const exportCSV = async (routes) => {
  const csv = buildCSV(routes);
  if (Platform.OS === "web") {
    downloadBlob(new Blob([csv], { type: "text/csv;charset=utf-8;" }), `routes_${Date.now()}.csv`);
    return;
  }
  const path = `${FileSystem.cacheDirectory}routes_${Date.now()}.csv`;
  await FileSystem.writeAsStringAsync(path, csv, { encoding: FileSystem.EncodingType.UTF8 });
  await shareFile(path, "text/csv", "Export CSV");
};

const exportPDF = async (routes) => {
  const html = buildHTML(routes);
  if (Platform.OS === "web") {
    const blob = new Blob([html], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const win = window.open(url, '_blank');
    if (!win) {
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = `routes_${Date.now()}.html`;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
    }
    return;
  }
  const { uri } = await Print.printToFileAsync({ html });
  await shareFile(uri, "application/pdf", "Export PDF");
};

const exportXLS = async (routes) => {
  const xls = buildXLS(routes);
  if (Platform.OS === "web") {
    downloadBlob(new Blob([xls], { type: "application/vnd.ms-excel;charset=utf-8" }), `routes_${Date.now()}.xls`);
    return;
  }
  const path = `${FileSystem.cacheDirectory}routes_${Date.now()}.xls`;
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

const PillRow = ({ options, value, onChange }) => (
  <View style={styles.pillRowContainer}>
    {options.map((opt) => {
      const on = value === opt;
      const activeBg =
        opt === "active" ? { backgroundColor: "#16A34A", borderColor: "#16A34A" }
          : opt === "inactive" ? { backgroundColor: "#DC2626", borderColor: "#DC2626" }
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

const StatusBadge = ({ status }) => {
  const s = STATUS_CFG[status] ?? STATUS_CFG.inactive;
  return (
    <View style={[styles.statusBadgeContainer, s.badge]}>
      <View style={[styles.statusDot, s.dot]} />
      <Text style={[styles.statusLabel, s.text]}>{s.label}</Text>
    </View>
  );
};

const RouteForm = ({ visible, editingRoute, form, setForm, formErrors, clearFieldError, saving, onSave, onClose }) => {
  const clr = (f) => (v) => { if (clearFieldError) clearFieldError(f); setForm({ ...form, [f]: v }); };
  return (
  <Portal>
    <Modal visible={visible} onDismiss={onClose} contentContainerStyle={styles.modalContent}>
      <KeyboardAvoidingView style={styles.flex1} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <View style={styles.flex1}>
          <View style={styles.modalHeader}>
            <View>
              <Text style={styles.modalTitle}>{editingRoute ? "Edit Route" : "New Route"}</Text>
              <Text style={styles.modalSubtitle}>{editingRoute ? `Updating ${editingRoute.origin} \u2192 ${editingRoute.destination}` : "Add a new route to the system"}</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Ionicons name="close" size={17} color="#64748b" />
            </TouchableOpacity>
          </View>
          <ScrollView style={styles.flex1} contentContainerStyle={{ paddingBottom: 30, paddingHorizontal: 20 }}
            showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
            <SectionLabel>Route Details</SectionLabel>
            <Field label="Origin *" value={form.origin} error={formErrors?.origin} onChangeText={clr("origin")} />
            <Field label="Destination *" value={form.destination} error={formErrors?.destination} onChangeText={clr("destination")} />

            <View style={styles.formRow}>
              <View style={styles.formRowItem}><Field label="Distance (km)" value={form.distance_km} error={formErrors?.distance_km} onChangeText={clr("distance_km")} keyboardType="numeric" /></View>
              <View style={styles.formRowItem}><Field label="Duration (min)" value={form.duration_minutes} error={formErrors?.duration_minutes} onChangeText={clr("duration_minutes")} keyboardType="numeric" /></View>
            </View>
            <View style={styles.formRow}>
              <View style={styles.formRowItem}><Field label="Base Fare *" value={form.base_price} error={formErrors?.base_price} onChangeText={clr("base_price")} keyboardType="numeric" /></View>
              <View style={styles.formRowItem}><Field label="Popularity" value={form.popularity_score} error={formErrors?.popularity_score} onChangeText={clr("popularity_score")} keyboardType="numeric" /></View>
            </View>

            <SectionLabel>Status</SectionLabel>
            <PillRow options={STATUSES} value={form.is_active} onChange={(v) => setForm({ ...form, is_active: v })} />
            {formErrors?.is_active ? <Text style={styles.fieldError}>{formErrors.is_active}</Text> : null}

            <SectionLabel>Stops (JSON array)</SectionLabel>
            <Field
              label='e.g. ["Sanga","Dhulikhel"]'
              value={form.stops}
              error={formErrors?.stops}
              onChangeText={clr("stops")}
              multiline
              numberOfLines={3}
            />

            <SectionLabel>Additional Info</SectionLabel>
            <Field label="Description" value={form.description} error={formErrors?.description} onChangeText={clr("description")} multiline numberOfLines={2} />
            <Field label="Route Image URL" value={form.route_image} error={formErrors?.route_image} onChangeText={clr("route_image")} />

            <View style={styles.formActions}>
              <TouchableOpacity onPress={onClose} style={styles.cancelBtn}><Text style={styles.cancelBtnText}>Cancel</Text></TouchableOpacity>
              <TouchableOpacity onPress={onSave} disabled={saving} style={styles.saveBtn}>
                {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.saveBtnText}>{editingRoute ? "UPDATE ROUTE" : "CREATE ROUTE"}</Text>}
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  </Portal>
  );
};

const ViewRouteModal = ({ visible, route, onClose }) => {
  if (!route) return null;
  const form = itemToForm(route);
  const stops = parseStops(route.stops);
  return (
    <Portal>
      <Modal visible={visible} onDismiss={onClose} contentContainerStyle={styles.modalContent}>
        <View style={styles.flex1}>
          <View style={styles.modalHeader}>
            <View>
              <Text style={styles.modalTitle}>View Route</Text>
              <Text style={styles.modalSubtitle}>Details for {route.origin} \u2192 {route.destination}</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Ionicons name="close" size={17} color="#64748b" />
            </TouchableOpacity>
          </View>
          <ScrollView style={styles.flex1} contentContainerStyle={{ paddingBottom: 30, paddingHorizontal: 20 }} showsVerticalScrollIndicator={false}>
            <SectionLabel>Route Details</SectionLabel>
            <View style={styles.viewField}><Text style={styles.viewFieldLabel}>Origin</Text><Text style={styles.viewFieldValue}>{form.origin}</Text></View>
            <View style={styles.viewField}><Text style={styles.viewFieldLabel}>Destination</Text><Text style={styles.viewFieldValue}>{form.destination}</Text></View>

            <SectionLabel>Distance & Duration</SectionLabel>
            <View style={styles.formRow}>
              <View style={styles.formRowItem}><Text style={styles.viewFieldLabel}>Distance</Text><Text style={styles.viewFieldValue}>{form.distance_km} km</Text></View>
              <View style={styles.formRowItem}><Text style={styles.viewFieldLabel}>Duration</Text><Text style={styles.viewFieldValue}>{form.duration_minutes} min</Text></View>
            </View>

            <SectionLabel>Pricing & Popularity</SectionLabel>
            <View style={styles.formRow}>
              <View style={styles.formRowItem}><Text style={styles.viewFieldLabel}>Base Fare</Text><Text style={styles.viewFieldValue}>Rs. {form.base_price}</Text></View>
              <View style={styles.formRowItem}><Text style={styles.viewFieldLabel}>Popularity</Text><Text style={styles.viewFieldValue}>{form.popularity_score}</Text></View>
            </View>

            <SectionLabel>Status</SectionLabel>
            <View style={styles.viewField}><StatusBadge status={form.is_active} /></View>

            {stops.length > 0 && (
              <>
                <SectionLabel>Stops</SectionLabel>
                <View style={styles.stopsContainer}>
                  {stops.map((stop, i) => (
                    <View key={i} style={styles.stopChip}>
                      <Text style={styles.stopChipText}>{stop}</Text>
                    </View>
                  ))}
                </View>
              </>
            )}

            {form.description ? (
              <>
                <SectionLabel>Description</SectionLabel>
                <View style={styles.viewField}><Text style={styles.viewFieldValue}>{form.description}</Text></View>
              </>
            ) : null}

            {form.route_image ? (
              <>
                <SectionLabel>Route Image</SectionLabel>
                <View style={styles.viewField}><Text style={styles.viewFieldValue}>{form.route_image}</Text></View>
              </>
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

export default function AdminRoutes() {
  const {
    routes,
    loading:    loadingStates,
    refreshing: refreshingStates,
    getPagination,
    updatePagination,
    getSearchQuery,
    updateSearchQuery,
    getSort,
    updateSort,
    fetchRoutes,
  } = useAdminData();

  const loading    = loadingStates.routes;
  const refreshing = refreshingStates.routes;
  const { page, limit, total: totalItems } = getPagination("routes");
  const searchQuery = getSearchQuery("routes");
  const { sortBy, sortOrder } = getSort("routes");

  const [searchInput,    setSearchInput]    = useState(searchQuery);
  const [modalVisible,   setModalVisible]   = useState(false);
  const [exportModalVisible, setExportModalVisible] = useState(false);
  const [viewModalVisible, setViewModalVisible] = useState(false);
  const [pdfModalVisible, setPdfModalVisible] = useState(false);
  const [pdfUri, setPdfUri] = useState(null);
  const [editingRoute,   setEditingRoute]   = useState(null);
  const [viewingRoute,   setViewingRoute]   = useState(null);
  const [saving,         setSaving]         = useState(false);
  const [deleting,       setDeleting]       = useState(false);
  const [exporting,      setExporting]      = useState(false);
  const [exportRange,    setExportRange]    = useState("page");
  const [pageSizeModalVisible, setPageSizeModalVisible] = useState(false);
  const [form,           setForm]           = useState({ ...EMPTY_FORM });
  const [formErrors,     setFormErrors]     = useState({});
  const debounceRef = useRef(null);

  useEffect(() => { fetchRoutes(); }, [page, limit, searchQuery, sortBy, sortOrder]);

  const commitSearch = useCallback(
    (text) => updateSearchQuery("routes", text),
    [updateSearchQuery],
  );

  const handleSearch = (text) => {
    setSearchInput(text);
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => commitSearch(text), 500);
  };

  const handleSort = (column) => {
    if (!column.sortable) return;
    const sortKey = column.key === "route" ? "origin" : column.key;
    const currentSort = getSort("routes");
    if (currentSort.sortBy === sortKey) {
      updateSort("routes", sortKey, currentSort.sortOrder === "ASC" ? "DESC" : "ASC");
    } else {
      updateSort("routes", sortKey, "ASC");
    }
  };

  const handlePageSizeChange = (newSize) => {
    updatePagination("routes", { limit: newSize, page: 1 });
    setPageSizeModalVisible(false);
  };

  const openCreate = () => { setEditingRoute(null); setForm({ ...EMPTY_FORM }); setFormErrors({}); setModalVisible(true); };
  const openEdit   = (item) => { setEditingRoute(item); setForm(itemToForm(item)); setFormErrors({}); setModalVisible(true); };
  const openView   = (item) => { setViewingRoute(item); setViewModalVisible(true); };

  const validateForm = () => {
    const errors = {};
    if (!form.origin.trim()) errors.origin = "Origin is required";
    if (!form.destination.trim()) errors.destination = "Destination is required";
    if (!form.base_price || parseFloat(form.base_price) < 0) errors.base_price = "Valid fare is required";
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
      const isUpdate = !!editingRoute;
      const payload = toPayload(form, isUpdate);
      if (isUpdate) {
        await updateRoute(editingRoute.id, payload);
      } else {
        await createRoute(payload);
      }
      setModalVisible(false);
      setFormErrors({});
      Alert.alert("Success", isUpdate ? "Route updated successfully!" : "New route added successfully!", [
        { text: "OK", onPress: () => fetchRoutes(true) },
      ]);
    } catch (err) {
      const data = err.response?.data;
      const msg = data?.message || err.message || "Could not save route.";
      const fieldErrors = data?.fields || data?.errors;
      if (fieldErrors && typeof fieldErrors === 'object') setFormErrors(fieldErrors);
      Alert.alert("Error", msg);
    } finally { setSaving(false); }
  };

  const handleDelete = (id, name) => {
    if (!id) {
      const msg = "Invalid route ID. Cannot delete.";
      Platform.OS === "web" ? window.alert(msg) : Alert.alert("Error", msg);
      return;
    }
    const doDelete = async () => {
      setDeleting(true);
      try {
        await deleteRoute(id);
        setDeleting(false);
        fetchRoutes(true);
      } catch (error) {
        setDeleting(false);
        const errMsg = error.response?.data?.message || error.message || "Could not delete the route.";
        Platform.OS === "web" ? window.alert(errMsg) : Alert.alert("Error", errMsg);
      }
    };
    if (Platform.OS === "web") {
      if (window.confirm(`Delete route "${name}"?`)) doDelete();
    } else {
      Alert.alert("Remove Route", `Delete route "${name}"?`, [
        { text: "Cancel", style: "cancel" },
        { text: "Delete", style: "destructive", onPress: doDelete },
      ]);
    }
  };

  const handleExport = async (type) => {
    setExportModalVisible(false);
    setExporting(true);
    try {
      const exportData = exportRange === "all"
        ? (await getRoutes({})).data.data?.routes || routes
        : routes;
      if (type === "csv") await exportCSV(exportData);
      if (type === "pdf") await exportPDF(exportData);
      if (type === "xls") await exportXLS(exportData);
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
    const current = getSort("routes");
    const sortKey = column.key === "route" ? "origin" : column.key;
    if (current.sortBy !== sortKey) return <Ionicons name="swap-vertical-outline" size={12} color="#94a3b8" style={{ marginLeft: 3 }} />;
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
          <Text style={styles.cellBusNumber} numberOfLines={1}>{item.origin} \u2192 {item.destination}</Text>
          <Text style={styles.cellRouteCode}>RT-{item.id}</Text>
        </View>
        <View style={[styles.tableCell, { flex: COLUMNS[1].flex }]}>
          <Text style={styles.cellText}>{item.distance_km ?? "\u2014"}</Text>
        </View>
        <View style={[styles.tableCell, { flex: COLUMNS[2].flex }]}>
          <Text style={styles.cellText}>{item.duration_minutes ?? "\u2014"} min</Text>
        </View>
        <View style={[styles.tableCell, { flex: COLUMNS[3].flex }]}>
          <Text style={styles.cellFare}>Rs. {item.base_price ?? "\u2014"}</Text>
        </View>
        <View style={[styles.tableCell, { flex: COLUMNS[4].flex }]}>
          <StatusBadge status={normalizeActive(item.is_active) ? "active" : "inactive"} />
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
          <TouchableOpacity
            onPress={() => handleDelete(item.id || item._id, `${item.origin} \u2192 ${item.destination}`)}
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
            <Text style={styles.headerTitle}>Route Manager</Text>
            <Text style={styles.headerCount}>{totalItems} route{totalItems !== 1 ? "s" : ""} found</Text>
          </View>
          <View style={styles.headerActions}>
            <TouchableOpacity onPress={() => setExportModalVisible(true)}
              disabled={exporting || routes.length === 0} style={styles.exportBtn}>
              {exporting ? <ActivityIndicator size="small" color="#fff" /> : <Ionicons name="share-outline" size={20} color="#fff" />}
            </TouchableOpacity>
            <TouchableOpacity onPress={openCreate} style={styles.addBtn}>
              <Ionicons name="add-circle" size={17} color="#1e3a8a" />
              <Text style={styles.addBtnText}>ADD ROUTE</Text>
            </TouchableOpacity>
          </View>
        </View>
        <Searchbar
          placeholder="Search by origin, destination..."
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
          <Text style={styles.loadingText}>Loading routes...</Text>
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
              onRefresh={() => fetchRoutes(true)}
              tintColor="#1e3a8a"
              colors={["#1e3a8a"]}
            />
          }
        >
          <View style={styles.statsBar}>
            {[
              { label: "Total", val: totalItems },
              { label: "Active", val: routes.filter(r => normalizeActive(r.is_active)).length },
              { label: "Inactive", val: routes.filter(r => !normalizeActive(r.is_active)).length },
            ].map(({ label, val }, i, arr) => (
              <View key={label} style={[styles.statBox, i < arr.length - 1 && styles.statBoxBorder]}>
                <Text style={[
                  styles.statValue,
                  label === "Active" ? { color: "#16A34A" } :
                    label === "Inactive" ? { color: "#DC2626" } : {}
                ]}>{val}</Text>
                <Text style={styles.statLabel}>{label}</Text>
              </View>
            ))}
          </View>

          <ScrollView horizontal showsHorizontalScrollIndicator={true} style={styles.tableScroll} nestedScrollEnabled={true}>
            <View style={styles.tableContainer}>
              {renderTableHeader()}
              {routes.length > 0 ? (
                routes.map((item, index) => renderTableRow(item, index))
              ) : (
                <View style={styles.emptyTable}>
                  <MaterialCommunityIcons name="map-marker-remove-outline" size={48} color="#e2e8f0" />
                  <Text style={styles.emptyText}>
                    {searchQuery ? `No results for "${searchQuery}"` : "No Routes Found"}
                  </Text>
                  {!searchQuery && (
                    <TouchableOpacity onPress={openCreate} style={styles.emptyAddBtn}>
                      <Ionicons name="add" size={16} color="#fff" />
                      <Text style={styles.emptyAddBtnText}>Add First Route</Text>
                    </TouchableOpacity>
                  )}
                </View>
              )}
            </View>
          </ScrollView>

          {routes.length > 0 && (
            <View style={styles.footerContainer}>
              <View style={styles.footerRow}>
                <TouchableOpacity onPress={() => setPageSizeModalVisible(true)} style={styles.pageSizeBtn}>
                  <Text style={styles.pageSizeText}>{limit} rows</Text>
                  <Ionicons name="chevron-down" size={12} color="#64748b" />
                </TouchableOpacity>
                <Text style={styles.entriesInfo}>Showing {startEntry} to {endEntry} of {totalItems} entries</Text>
                <View style={styles.pagination}>
                  <TouchableOpacity disabled={page <= 1}
                    onPress={() => updatePagination("routes", { page: page - 1 })}
                    style={[styles.paginationBtn, page <= 1 ? styles.paginationBtnDisabled : styles.paginationBtnActive]}>
                    <Text style={[styles.paginationBtnText, page <= 1 ? styles.paginationTextDisabled : styles.paginationTextActive]}>Prev</Text>
                  </TouchableOpacity>
                  {getPageNumbers().map((p) => (
                    <TouchableOpacity key={p} onPress={() => updatePagination("routes", { page: p })}
                      style={[styles.pageNumBtn, p === page && styles.pageNumBtnActive]}>
                      <Text style={[styles.pageNumText, p === page && styles.pageNumTextActive]}>{p}</Text>
                    </TouchableOpacity>
                  ))}
                  <TouchableOpacity disabled={page >= totalPages}
                    onPress={() => updatePagination("routes", { page: page + 1 })}
                    style={[styles.paginationBtn, page >= totalPages ? styles.paginationBtnDisabled : styles.paginationBtnActive]}>
                    <Text style={[styles.paginationBtnText, page >= totalPages ? styles.paginationTextDisabled : styles.paginationTextActive]}>Next</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          )}
        </ScrollView>
      )}

      <RouteForm visible={modalVisible} editingRoute={editingRoute} form={form}
        setForm={setForm} formErrors={formErrors} clearFieldError={clearFieldError}
        saving={saving} onSave={handleSave} onClose={() => setModalVisible(false)} />

      <ViewRouteModal visible={viewModalVisible} route={viewingRoute} onClose={() => setViewModalVisible(false)} />

      <PdfPreviewModal visible={pdfModalVisible} uri={pdfUri} onClose={() => setPdfModalVisible(false)} />

      <Portal>
        <Modal visible={exportModalVisible} onDismiss={() => setExportModalVisible(false)} contentContainerStyle={styles.exportModal}>
          <Text style={styles.exportModalTitle}>Export Route Data</Text>
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
  viewField: { marginBottom: 12 },
  viewFieldLabel: { fontSize: 10, fontWeight: "700", color: "#64748B", marginBottom: 4 },
  viewFieldValue: { fontSize: 12, fontWeight: "600", color: "#0F172A" },
  stopsContainer: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 12 },
  stopChip: { backgroundColor: "#DBEAFE", paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  stopChipText: { fontSize: 10, fontWeight: "800", color: "#1D4ED8" },
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
  cellRouteCode: { fontSize: 9, fontWeight: "700", color: "#94A3B8", marginTop: 2 },
  cellText: { fontSize: 11, fontWeight: "600", color: "#475569" },
  cellFare: { fontSize: 11, fontWeight: "700", color: "#059669" },
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
