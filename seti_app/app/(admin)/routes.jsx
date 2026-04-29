/**
 * AdminRoutes.jsx – Route Manager (NativeWind / Tailwind CSS)
 *
 * Install once:
 *   npx expo install nativewind tailwindcss expo-print expo-sharing expo-file-system
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
import * as Print      from "expo-print";
import * as Sharing    from "expo-sharing";
import * as FileSystem from "expo-file-system";
import Animated, { FadeInDown } from "react-native-reanimated";
import { createRoute, deleteRoute, updateRoute } from "../../api/routes";
import { useAdminData } from "../../context/AdminContext";

// ─── Static config ────────────────────────────────────────────────────────────
const ACTIVE_STATUSES = ["active", "inactive"];

const normalizeActive = (is_active) => {
  if (typeof is_active === "number") return is_active === 1;
  if (typeof is_active === "boolean") return is_active;
  return is_active === "1" || is_active === "true" || !!is_active;
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

// ─── Pure helpers ─────────────────────────────────────────────────────────────
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

/** Map form state → API payload. If `isUpdate` is true, popularity_score is omitted. */
const toPayload = (f, isUpdate = false) => {
  let stops = [];
  try { stops = JSON.parse(f.stops); } catch { stops = []; }
  // ensure it's always an array
  if (!Array.isArray(stops)) stops = [];

  const payload = {
    origin:           f.origin,
    destination:      f.destination,
    distance_km:      parseFloat(f.distance_km) || null,
    duration_minutes: parseInt(f.duration_minutes) || null,
    base_price:       parseFloat(f.base_price) || null,
    is_active:        f.is_active === "active",
    stops:            stops.length > 0 ? stops : [],
    description:      f.description || null,
    route_image:      f.route_image || null,
  };

  // only include popularity_score for create
  if (!isUpdate) {
    payload.popularity_score = parseInt(f.popularity_score) || 0;
  }

  return payload;
};

// ─── Export builders ──────────────────────────────────────────────────────────
const buildHTML = (routes) => `<!DOCTYPE html><html><head><meta charset="utf-8"/>
<style>
  body{font-family:Arial,sans-serif;padding:28px;color:#1e293b}
  h1{color:#1e3a8a;font-size:22px;font-weight:900;margin:0}
  p{color:#64748b;font-size:12px;margin:4px 0 24px}
  table{width:100%;border-collapse:collapse;font-size:11px}
  th{background:#1e3a8a;color:#fff;padding:8px 10px;text-align:left;font-size:9px;text-transform:uppercase}
  td{padding:7px 10px;border-bottom:1px solid #e2e8f0}
  tr:nth-child(even) td{background:#f8fafc}
  .badge{display:inline-block;padding:2px 8px;border-radius:12px;font-size:9px;font-weight:700}
  .active{background:#dcfce7;color:#16a34a}
  .inactive{background:#fee2e2;color:#dc2626}
</style></head><body>
<h1>🗺️ Route Report</h1>
<p>Generated: ${new Date().toLocaleString()} · ${routes.length} routes</p>
<table>
  <thead><tr>
    <th>#</th><th>Origin</th><th>Destination</th><th>Distance (km)</th><th>Duration (min)</th>
    <th>Base Price</th><th>Active</th><th>Popularity</th><th>Description</th>
  </tr></thead>
  <tbody>
    ${routes.map((r, i) => `<tr>
      <td>${i+1}</td>
      <td>${r.origin}</td>
      <td>${r.destination}</td>
      <td>${r.distance_km ?? "—"}</td>
      <td>${r.duration_minutes ?? "—"}</td>
      <td>${r.base_price ?? "—"}</td>
      <td><span class="badge ${r.is_active ? 'active' : 'inactive'}">${r.is_active ? 'Active' : 'Inactive'}</span></td>
      <td>${r.popularity_score ?? 0}</td>
      <td>${r.description || "—"}</td>
    </tr>`).join("")}
  </tbody>
</table></body></html>`;

const buildCSV = (routes) => {
  const H = ["ID","Origin","Destination","Distance (km)","Duration (min)","Base Price","Active","Stops","Popularity","Description","Image"];
  const E = (v) => `"${String(v ?? "").replace(/"/g, '""')}"`;
  const rows = routes.map((r) => [
    r.id, r.origin, r.destination, r.distance_km, r.duration_minutes,
    r.base_price, r.is_active ? "Yes" : "No",
    parseStops(r.stops).join("; ") || "—",
    r.popularity_score, r.description, r.route_image,
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

const exportCSV = async (routes) => {
  const csv = buildCSV(routes);
  if (Platform.OS === "web") {
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `routes_${Date.now()}.csv`;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
    return;
  }
  const path = `${FileSystem.cacheDirectory}routes_${Date.now()}.csv`;
  await FileSystem.writeAsStringAsync(path, csv, { encoding: FileSystem.EncodingType.UTF8 });
  await shareFile(path, "text/csv", "Export CSV");
};

const exportPDF = async (routes) => {
  const html = buildHTML(routes);
  if (Platform.OS === "web") {
    try {
      const { uri } = await Print.printToFileAsync({ html });
      if (uri) {
        const anchor = document.createElement("a");
        anchor.href = uri;
        anchor.download = `routes_${Date.now()}.pdf`;
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

const PillRow = ({ options, value, onChange }) => {
  const activeBgMap = {
    active:   "bg-green-600 border-green-600",
    inactive: "bg-red-600 border-red-600",
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

// ─── Route Card ──────────────────────────────────────────────────────────────
const RouteCard = React.memo(({ item, index, onEdit, onDelete, onView }) => {
  const isActive = normalizeActive(item.is_active);
  const stops = parseStops(item.stops);

  return (
    <Animated.View entering={FadeInDown.delay(index * 40).springify()}>
      <View
        className="bg-white mx-3 mb-3 rounded-2xl p-4 border border-slate-100"
        style={{ shadowColor: "#1e3a8a", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 2 }}
      >
        <View className="flex-row items-start justify-between mb-3">
          <View className="flex-row items-center gap-3 flex-1">
            <View className="bg-blue-50 p-2.5 rounded-xl">
              <MaterialCommunityIcons name="routes" size={22} color="#1e3a8a" />
            </View>
            <View className="flex-1">
              <Text className="text-base font-black text-slate-900" numberOfLines={1}>
                {item.origin} → {item.destination}
              </Text>
              <Text className="text-xs font-bold text-slate-500">
                {item.distance_km} km · {item.duration_minutes} min
              </Text>
            </View>
          </View>
          <View className="flex-row items-center gap-1">
            <View className={`w-2 h-2 rounded-full ${isActive ? 'bg-green-500' : 'bg-red-500'}`} />
            <Text className={`text-[9px] font-black ${isActive ? 'text-green-700' : 'text-red-700'}`}>
              {isActive ? 'ACTIVE' : 'INACTIVE'}
            </Text>
          </View>
        </View>

        <View className="flex-row gap-3 pt-3 mb-3 border-t border-slate-50">
          <View className="flex-row items-center gap-1">
            <Ionicons name="cash-outline" size={13} color="#94a3b8" />
            <Text className="text-xs font-bold text-slate-600">Rs. {item.base_price}</Text>
          </View>
          <View className="flex-row items-center gap-1">
            <Ionicons name="star-outline" size={13} color="#94a3b8" />
            <Text className="text-xs font-bold text-slate-600">{item.popularity_score ?? 0}</Text>
          </View>
          {stops.length > 0 && (
            <View className="flex-row items-center gap-1">
              <Ionicons name="flag-outline" size={13} color="#94a3b8" />
              <Text className="text-xs font-bold text-slate-600">{stops.length} stops</Text>
            </View>
          )}
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
            onPress={() => onDelete(item.id, `${item.origin} → ${item.destination}`)}
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

// ─── Create / Edit Form Modal ─────────────────────────────────────────────────
const RouteForm = ({ visible, editingRoute, form, setForm, saving, onSave, onClose }) => (
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
                {editingRoute ? "Edit Route" : "New Route"}
              </Text>
              <Text className="text-xs text-slate-400 mt-0.5">
                {editingRoute ? `Updating ${editingRoute.origin} → ${editingRoute.destination}` : "Add a new route"}
              </Text>
            </View>
            <TouchableOpacity onPress={onClose} className="w-9 h-9 bg-slate-100 rounded-xl items-center justify-center">
              <Ionicons name="close" size={17} color="#64748b" />
            </TouchableOpacity>
          </View>

          <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 30 }} className="px-5" showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
            <SectionLabel>Route Details</SectionLabel>
            <Field label="Origin *" value={form.origin} onChangeText={(t) => setForm({ ...form, origin: t })} />
            <Field label="Destination *" value={form.destination} onChangeText={(t) => setForm({ ...form, destination: t })} />

            <View className="flex-row gap-2">
              <View className="flex-1"><Field label="Distance (km)" value={form.distance_km} onChangeText={(t) => setForm({ ...form, distance_km: t })} keyboardType="numeric" /></View>
              <View className="flex-1"><Field label="Duration (min)" value={form.duration_minutes} onChangeText={(t) => setForm({ ...form, duration_minutes: t })} keyboardType="numeric" /></View>
            </View>
            <View className="flex-row gap-2">
              <View className="flex-1"><Field label="Base Price" value={form.base_price} onChangeText={(t) => setForm({ ...form, base_price: t })} keyboardType="numeric" /></View>
              <View className="flex-1"><Field label="Popularity" value={form.popularity_score} onChangeText={(t) => setForm({ ...form, popularity_score: t })} keyboardType="numeric" /></View>
            </View>

            <SectionLabel>Status</SectionLabel>
            <PillRow options={ACTIVE_STATUSES} value={form.is_active} onChange={(v) => setForm({ ...form, is_active: v })} />

            <SectionLabel>Stops (JSON array)</SectionLabel>
            <Field
              label='e.g. ["Sanga","Dhulikhel"]'
              value={form.stops}
              onChangeText={(t) => setForm({ ...form, stops: t })}
              multiline
              numberOfLines={3}
            />

            <SectionLabel>Additional Info</SectionLabel>
            <Field label="Description" value={form.description} onChangeText={(t) => setForm({ ...form, description: t })} multiline numberOfLines={2} />
            <Field label="Route Image URL" value={form.route_image} onChangeText={(t) => setForm({ ...form, route_image: t })} />

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
                {saving ? <ActivityIndicator color="#fff" /> : <Text className="font-black text-white text-sm">{editingRoute ? "UPDATE ROUTE" : "CREATE ROUTE"}</Text>}
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  </Portal>
);

// ─── View Route Modal ────────────────────────────────────────────────────────
const ViewRouteModal = ({ visible, route, onClose }) => {
  if (!route) return null;
  const form = itemToForm(route);
  const stops = parseStops(route.stops);

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
              <Text className="text-lg font-black text-slate-900">Route Detail</Text>
              <Text className="text-xs text-slate-400 mt-0.5">{route.origin} → {route.destination}</Text>
            </View>
            <TouchableOpacity onPress={onClose} className="w-9 h-9 bg-slate-100 rounded-xl items-center justify-center">
              <Ionicons name="close" size={17} color="#64748b" />
            </TouchableOpacity>
          </View>

          <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 30 }} className="px-5" showsVerticalScrollIndicator={false}>
            <SectionLabel>Route Details</SectionLabel>
            <View className="mb-3"><Text className="text-sm font-semibold text-slate-900">Origin: {form.origin}</Text></View>
            <View className="mb-3"><Text className="text-sm font-semibold text-slate-900">Destination: {form.destination}</Text></View>

            <SectionLabel>Distance & Duration</SectionLabel>
            <View className="flex-row gap-2 mb-3">
              <View className="flex-1"><Text className="text-sm font-semibold text-slate-900">Distance: {form.distance_km} km</Text></View>
              <View className="flex-1"><Text className="text-sm font-semibold text-slate-900">Duration: {form.duration_minutes} min</Text></View>
            </View>

            <SectionLabel>Pricing & Popularity</SectionLabel>
            <View className="flex-row gap-2 mb-3">
              <View className="flex-1"><Text className="text-sm font-semibold text-slate-900">Base Price: Rs. {form.base_price}</Text></View>
              <View className="flex-1"><Text className="text-sm font-semibold text-slate-900">Popularity: {form.popularity_score}</Text></View>
            </View>

            <SectionLabel>Status</SectionLabel>
            <View className="mb-3">
              <Text className={`text-sm font-bold ${form.is_active === 'active' ? 'text-green-700' : 'text-red-700'}`}>
                {form.is_active === 'active' ? 'ACTIVE' : 'INACTIVE'}
              </Text>
            </View>

            {stops.length > 0 && (
              <>
                <SectionLabel>Stops</SectionLabel>
                <View className="flex-row flex-wrap gap-2 mb-3">
                  {stops.map((stop, i) => (
                    <View key={i} className="bg-blue-100 px-2 py-1 rounded-md">
                      <Text className="text-xs font-bold text-blue-700">{stop}</Text>
                    </View>
                  ))}
                </View>
              </>
            )}

            {form.description ? (
              <>
                <SectionLabel>Description</SectionLabel>
                <View className="mb-3"><Text className="text-sm text-slate-700">{form.description}</Text></View>
              </>
            ) : null}

            {form.route_image ? (
              <>
                <SectionLabel>Image</SectionLabel>
                <View className="mb-3"><Text className="text-sm text-blue-600 underline">{form.route_image}</Text></View>
              </>
            ) : null}

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
export default function AdminRoutes() {
  const {
    routes,
    loading:    loadingStates,
    refreshing: refreshingStates,
    getPagination,
    updatePagination,
    getSearchQuery,
    updateSearchQuery,
    fetchRoutes,
  } = useAdminData();

  const loading    = loadingStates.routes;
  const refreshing = refreshingStates.routes;
  const { page, limit, total: totalItems } = getPagination("routes");
  const searchQuery = getSearchQuery("routes");

  const [searchInput,    setSearchInput]    = useState(searchQuery);
  const [modalVisible,   setModalVisible]   = useState(false);
  const [exportModalVisible, setExportModalVisible] = useState(false);
  const [viewModalVisible, setViewModalVisible] = useState(false);
  const [editingRoute,   setEditingRoute]   = useState(null);
  const [viewingRoute,   setViewingRoute]   = useState(null);
  const [saving,         setSaving]         = useState(false);
  const [deleting,       setDeleting]       = useState(false);
  const [exporting,      setExporting]      = useState(false);
  const [form,           setForm]           = useState({ ...EMPTY_FORM });
  const debounceRef = useRef(null);

  useEffect(() => { fetchRoutes(); }, [page, limit, searchQuery]);

  const commitSearch = useCallback(
    (text) => updateSearchQuery("routes", text),
    [updateSearchQuery],
  );

  const handleSearch = (text) => {
    setSearchInput(text);
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => commitSearch(text), 500);
  };

  const openCreate = () => { setEditingRoute(null); setForm({ ...EMPTY_FORM }); setModalVisible(true); };
  const openEdit   = (item) => { setEditingRoute(item); setForm(itemToForm(item)); setModalVisible(true); };
  const openView   = (item) => { setViewingRoute(item); setViewModalVisible(true); };

  const handleSave = async () => {
    if (!form.origin.trim() || !form.destination.trim())
      return Alert.alert("Required", "Origin and Destination are required.");
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
      fetchRoutes(true);
    } catch (e) {
      const msg = e?.response?.data?.message || e.message || "Could not save route.";
      Alert.alert("Error", msg);
    } finally { setSaving(false); }
  };

  const handleDelete = (id, name) => {
    Alert.alert("Remove Route", `Delete route "${name}"?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          setDeleting(true);
          try {
            await deleteRoute(id);
            fetchRoutes(true);
          } catch (e) {
            Alert.alert("Error", "Could not delete route.");
          } finally { setDeleting(false); }
        },
      },
    ]);
  };

  const handleExport = async (type) => {
    setExportModalVisible(false);
    setExporting(true);
    try {
      if (type === "csv") await exportCSV(routes);
      if (type === "pdf") await exportPDF(routes);
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
            <Text className="text-xl font-black text-white tracking-tight">Route Manager</Text>
            <Text className="text-xs text-blue-300 font-semibold mt-0.5">
              {totalItems} route{totalItems !== 1 ? "s" : ""} found
            </Text>
          </View>

          <View className="flex-row items-center gap-2">
            <TouchableOpacity
              onPress={() => setExportModalVisible(true)}
              disabled={exporting || routes.length === 0}
              className="w-11 h-11 rounded-xl items-center justify-center"
              style={{ backgroundColor: "rgba(255,255,255,0.15)" }}
            >
              {exporting ? <ActivityIndicator size="small" color="#fff" /> : <Ionicons name="share-outline" size={20} color="#fff" />}
            </TouchableOpacity>
            <TouchableOpacity onPress={openCreate} className="flex-row items-center gap-1.5 bg-white px-4 h-11 rounded-xl">
              <Ionicons name="add-circle" size={17} color="#1e3a8a" />
              <Text className="font-black text-blue-900 text-xs">ADD ROUTE</Text>
            </TouchableOpacity>
          </View>
        </View>

        <Searchbar
          placeholder="Search by origin, destination..."
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
          <Text className="mt-3 text-slate-400 font-bold text-sm">Loading routes...</Text>
        </View>
      ) : (
        <FlatList
          style={{ flex: 1 }}
          data={routes}
          keyExtractor={(item) => item.id?.toString()}
          renderItem={({ item, index }) => (
            <RouteCard
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
                { label: "Total",   val: totalItems },
                { label: "Active",  val: routes.filter(r => normalizeActive(r.is_active)).length },
                { label: "Inactive",val: routes.filter(r => !normalizeActive(r.is_active)).length },
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
              onRefresh={() => fetchRoutes(true)}
              tintColor="#1e3a8a"
              colors={["#1e3a8a"]}
            />
          }
          ListEmptyComponent={() => (
            <View className="items-center pt-24 px-10">
              <MaterialCommunityIcons name="map-marker-remove-outline" size={72} color="#e2e8f0" />
              <Text className="mt-4 text-slate-400 font-extrabold text-base text-center">
                {searchQuery ? `No results for "${searchQuery}"` : "No routes found"}
              </Text>
              {!searchQuery && (
                <TouchableOpacity onPress={openCreate} className="mt-5 flex-row items-center gap-2 bg-blue-900 px-6 py-3 rounded-2xl">
                  <Ionicons name="add" size={16} color="#fff" />
                  <Text className="text-white font-black text-sm">Add First Route</Text>
                </TouchableOpacity>
              )}
            </View>
          )}
          ListFooterComponent={() =>
            routes.length > 0 ? (
              <View className="mx-3 mt-1 mb-6">
                <View className="flex-row items-center justify-between bg-white rounded-2xl px-4 py-3 border border-slate-100">
                  <Text className="text-xs text-slate-400 font-bold">
                    Page {page} / {totalPages} · {routes.length} of {totalItems}
                  </Text>
                  <View className="flex-row gap-2">
                    <TouchableOpacity
                      disabled={page <= 1}
                      onPress={() => updatePagination("routes", { page: page - 1 })}
                      className={`px-4 py-2 rounded-xl border ${page <= 1 ? "bg-slate-50 border-slate-200" : "bg-blue-900 border-blue-900"}`}
                    >
                      <Text className={`text-xs font-extrabold ${page <= 1 ? "text-slate-300" : "text-white"}`}>← Prev</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      disabled={page >= totalPages}
                      onPress={() => updatePagination("routes", { page: page + 1 })}
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
      <RouteForm
        visible={modalVisible}
        editingRoute={editingRoute}
        form={form}
        setForm={setForm}
        saving={saving}
        onSave={handleSave}
        onClose={() => setModalVisible(false)}
      />

      {/* View Modal */}
      <ViewRouteModal
        visible={viewModalVisible}
        route={viewingRoute}
        onClose={() => setViewModalVisible(false)}
      />

      {/* Export modal */}
      <Portal>
        <Modal
          visible={exportModalVisible}
          onDismiss={() => setExportModalVisible(false)}
          contentContainerStyle={{ backgroundColor: "white", marginHorizontal: 40, borderRadius: 16, padding: 16 }}
        >
          <Text className="text-base font-black text-slate-800 mb-3">Export Route Data</Text>
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