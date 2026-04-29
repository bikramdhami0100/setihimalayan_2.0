/**
 * AdminUsers.jsx – User Manager (NativeWind / Tailwind CSS)
 *
 * Install once:
 *   npx expo install nativewind tailwindcss expo-print expo-sharing expo-file-system expo-image-picker
 *
 * tailwind.config.js  →  content: ["./app/**\/*.{js,jsx,ts,tsx}"]
 * babel.config.js     →  plugins: ["nativewind/babel"]
 */

import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  View, Text, SafeAreaView, ScrollView, TouchableOpacity,
  ActivityIndicator, Alert, FlatList, RefreshControl,
  KeyboardAvoidingView, Platform, StatusBar, Image,
} from "react-native";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { Portal, Modal, TextInput, Searchbar, Menu } from "react-native-paper";
import * as Print      from "expo-print";
import * as Sharing    from "expo-sharing";
import * as FileSystem from "expo-file-system";
import * as ImagePicker from "expo-image-picker";
import Animated, { FadeInDown } from "react-native-reanimated";
import { createUser, deleteUser, updateUser } from "../../api/users";
import { useAdminData } from "../../context/AdminContext";

// ─── Static config ────────────────────────────────────────────────────────────
const ROLES  = ["passenger", "admin", "super_admin"];
const STATUSES = ["active", "inactive", "suspended"];

const STATUS_CFG = {
  active:    { dot: "bg-green-500",  badge: "bg-green-100",  text: "text-green-700",  label: "ACTIVE"    },
  inactive:  { dot: "bg-red-500",    badge: "bg-red-100",    text: "text-red-700",    label: "INACTIVE"  },
  suspended: { dot: "bg-yellow-500", badge: "bg-yellow-100", text: "text-yellow-700", label: "SUSPENDED" },
};

const EMPTY_FORM = {
  email: "",
  phone: "",
  full_name: "",
  password: "",
  role: "passenger",
  status: "active",
  profile_image: null,       // { uri, name, type } from image picker, or null
  date_of_birth: "",
  address: "",
  city: "",
  state: "",
  country: "Nepal",
  postal_code: "",
};

// ─── Pure helpers ─────────────────────────────────────────────────────────────
const itemToForm = (item) => ({
  email:            item.email        ?? "",
  phone:            item.phone        ?? "",
  full_name:        item.full_name    ?? "",
  password:         "",               // never pre‑fill password
  role:             item.role         ?? "passenger",
  status:           item.status       ?? "active",
  profile_image:    item.profile_image ? { uri: item.profile_image } : null, // string path -> { uri }
  date_of_birth:    item.date_of_birth ? item.date_of_birth.split("T")[0] : "",
  address:          item.address      ?? "",
  city:             item.city         ?? "",
  state:            item.state        ?? "",
  country:          item.country      ?? "Nepal",
  postal_code:      item.postal_code  ?? "",
});

const toPayload = (form) => {
  const data = {
    email:         form.email,
    phone:         form.phone,
    full_name:     form.full_name,
    role:          form.role,
    status:        form.status,
    date_of_birth: form.date_of_birth || null,
    address:       form.address      || null,
    city:          form.city         || null,
    state:         form.state        || null,
    country:       form.country      || "Nepal",
    postal_code:   form.postal_code  || null,
  };

  // Only include password if provided
  if (form.password && form.password.trim()) {
    data.password = form.password.trim();
  }

  return data;
};

// ─── Export builders (HTML, CSV, PDF) – similar to previous pages, adjusted for user fields ─
const buildHTML = (users) => `<!DOCTYPE html><html><head><meta charset="utf-8"/>
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
  .suspended{background:#fef9c3;color:#ca8a04}
</style></head><body>
<h1>👥 User Report</h1>
<p>Generated: ${new Date().toLocaleString()} · ${users.length} users</p>
<table>
  <thead><tr>
    <th>#</th><th>Name</th><th>Email</th><th>Phone</th><th>Role</th><th>Status</th><th>Country</th>
  </tr></thead>
  <tbody>
    ${users.map((u, i) => `<tr>
      <td>${i+1}</td>
      <td><strong>${u.full_name}</strong></td>
      <td>${u.email}</td>
      <td>${u.phone}</td>
      <td>${u.role}</td>
      <td><span class="badge ${u.status}">${u.status}</span></td>
      <td>${u.country || "—"}</td>
    </tr>`).join("")}
  </tbody>
</table></body></html>`;

const buildCSV = (users) => {
  const H = ["ID","Name","Email","Phone","Role","Status","Country","City","Address","Date of Birth","Postal Code"];
  const E = (v) => `"${String(v ?? "").replace(/"/g, '""')}"`;
  const rows = users.map((u) => [
    u.id, u.full_name, u.email, u.phone, u.role, u.status, u.country,
    u.city, u.address, u.date_of_birth?.split("T")[0], u.postal_code,
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

const exportCSV = async (users) => {
  const csv = buildCSV(users);
  if (Platform.OS === "web") {
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `users_${Date.now()}.csv`;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
    return;
  }
  const path = `${FileSystem.cacheDirectory}users_${Date.now()}.csv`;
  await FileSystem.writeAsStringAsync(path, csv, { encoding: FileSystem.EncodingType.UTF8 });
  await shareFile(path, "text/csv", "Export CSV");
};

const exportPDF = async (users) => {
  const html = buildHTML(users);
  if (Platform.OS === "web") {
    try {
      const { uri } = await Print.printToFileAsync({ html });
      if (uri) {
        const anchor = document.createElement("a");
        anchor.href = uri;
        anchor.download = `users_${Date.now()}.pdf`;
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
    active:    "bg-green-600 border-green-600",
    inactive:  "bg-red-600 border-red-600",
    suspended: "bg-yellow-500 border-yellow-500",
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

/** Status badge for card */
const StatusBadge = ({ status }) => {
  const s = STATUS_CFG[status] ?? STATUS_CFG.inactive;
  return (
    <View className={`flex-row items-center gap-1 px-2 py-1 rounded-lg ${s.badge}`}>
      <View className={`w-1.5 h-1.5 rounded-full ${s.dot}`} />
      <Text className={`text-[9px] font-black ${s.text}`}>{s.label}</Text>
    </View>
  );
};

// ─── User card ──────────────────────────────────────────────────────────────
const UserCard = React.memo(({ item, index, onEdit, onDelete, onView }) => (
  <Animated.View entering={FadeInDown.delay(index * 40).springify()}>
    <View
      className="bg-white mx-3 mb-3 rounded-2xl p-4 border border-slate-100"
      style={{ shadowColor: "#1e3a8a", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 2 }}
    >
      <View className="flex-row items-start justify-between mb-3">
        <View className="flex-row items-center gap-3 flex-1">
          <View className="bg-blue-50 p-2.5 rounded-xl">
            <MaterialCommunityIcons name="account" size={22} color="#1e3a8a" />
          </View>
          <View className="flex-1">
            <Text className="text-base font-black text-slate-900" numberOfLines={1}>{item.full_name}</Text>
            <Text className="text-xs font-bold text-slate-500">{item.email}</Text>
          </View>
        </View>
        <StatusBadge status={item.status} />
      </View>

      <View className="flex-row gap-3 pt-3 mb-3 border-t border-slate-50">
        <View className="flex-row items-center gap-1">
          <Ionicons name="call-outline" size={13} color="#94a3b8" />
          <Text className="text-xs font-bold text-slate-600">{item.phone}</Text>
        </View>
        <View className="flex-row items-center gap-1">
          <Ionicons name="shield-checkmark-outline" size={13} color="#94a3b8" />
          <Text className="text-xs font-bold text-slate-600">{item.role}</Text>
        </View>
        {item.country && (
          <View className="flex-row items-center gap-1">
            <Ionicons name="location-outline" size={13} color="#94a3b8" />
            <Text className="text-xs font-bold text-slate-600">{item.country}</Text>
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
          onPress={() => onDelete(item.id, item.full_name)}
          className="flex-row items-center gap-1 bg-red-50 px-4 py-2 rounded-xl"
        >
          <Ionicons name="trash-outline" size={13} color="#ef4444" />
          <Text className="text-xs font-extrabold text-red-500">Delete</Text>
        </TouchableOpacity>
      </View>
    </View>
  </Animated.View>
));

// ─── Image picker component ──────────────────────────────────────────────────
const ImagePickerField = ({ label, image, onChange }) => {
  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission required', 'We need camera roll access to select a profile photo.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });
    if (!result.canceled && result.assets?.length > 0) {
      const asset = result.assets[0];
      onChange({
        uri: asset.uri,
        name: asset.fileName || `profile_${Date.now()}.jpg`,
        type: asset.mimeType || 'image/jpeg',
      });
    }
  };

  const removeImage = () => onChange(null);

  return (
    <View className="mb-3">
      <Text className="text-xs font-bold text-slate-500 mb-2">{label}</Text>
      <View className="flex-row items-center gap-3">
        {image ? (
          <View className="relative">
            <Image source={{ uri: image.uri }} className="w-20 h-20 rounded-xl" />
            <TouchableOpacity
              onPress={removeImage}
              className="absolute -top-2 -right-2 bg-red-500 rounded-full p-1"
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Ionicons name="close-circle" size={16} color="white" />
            </TouchableOpacity>
          </View>
        ) : (
          <TouchableOpacity
            onPress={pickImage}
            className="w-20 h-20 bg-slate-100 rounded-xl items-center justify-center border border-dashed border-slate-300"
          >
            <Ionicons name="camera-outline" size={24} color="#94a3b8" />
          </TouchableOpacity>
        )}
        <View className="flex-1">
          <TouchableOpacity onPress={pickImage} className="bg-slate-100 px-4 py-2 rounded-xl">
            <Text className="text-xs font-bold text-blue-700">Choose Photo</Text>
          </TouchableOpacity>
          {image && <Text className="text-[10px] text-slate-400 mt-1">Tap X to remove</Text>}
        </View>
      </View>
    </View>
  );
};

// ─── Create / Edit form modal ────────────────────────────────────────────────
const UserForm = ({ visible, editingUser, form, setForm, saving, onSave, onClose }) => {
  const roleOptions = ROLES.map(r => ({ label: r.charAt(0).toUpperCase() + r.slice(1), value: r }));
  const statusOptions = STATUSES.map(s => ({ label: s.charAt(0).toUpperCase() + s.slice(1), value: s }));

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
                  {editingUser ? "Edit User" : "New User"}
                </Text>
                <Text className="text-xs text-slate-400 mt-0.5">
                  {editingUser ? `Updating ${editingUser.full_name}` : "Create a user account"}
                </Text>
              </View>
              <TouchableOpacity onPress={onClose} className="w-9 h-9 bg-slate-100 rounded-xl items-center justify-center">
                <Ionicons name="close" size={17} color="#64748b" />
              </TouchableOpacity>
            </View>

            <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 30 }} className="px-5" showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
              {/* Profile image */}
              <SectionLabel>Profile Photo</SectionLabel>
              <ImagePickerField
                label="Photo"
                image={form.profile_image}
                onChange={(img) => setForm({ ...form, profile_image: img })}
              />

              {/* Basic info */}
              <SectionLabel>Account Information</SectionLabel>
              <Field label="Full Name *" value={form.full_name} onChangeText={(t) => setForm({ ...form, full_name: t })} />
              <Field label="Email *" value={form.email} onChangeText={(t) => setForm({ ...form, email: t })} keyboardType="email-address" />
              <Field label="Phone *" value={form.phone} onChangeText={(t) => setForm({ ...form, phone: t })} keyboardType="phone-pad" />
              <Field
                label={editingUser ? "Password (leave blank to keep unchanged)" : "Password *"}
                value={form.password}
                onChangeText={(t) => setForm({ ...form, password: t })}
                secureTextEntry
              />

              <SectionLabel>Role & Status</SectionLabel>
              <Dropdown label="Role" value={form.role} options={roleOptions} onSelect={(v) => setForm({ ...form, role: v })} />
              <PillRow options={STATUSES} value={form.status} onChange={(v) => setForm({ ...form, status: v })} />

              <SectionLabel>Personal Details</SectionLabel>
              <Field label="Date of Birth (YYYY-MM-DD)" value={form.date_of_birth} onChangeText={(t) => setForm({ ...form, date_of_birth: t })} />
              <Field label="Address" value={form.address} onChangeText={(t) => setForm({ ...form, address: t })} />
              <View className="flex-row gap-2">
                <View className="flex-1"><Field label="City" value={form.city} onChangeText={(t) => setForm({ ...form, city: t })} /></View>
                <View className="flex-1"><Field label="State" value={form.state} onChangeText={(t) => setForm({ ...form, state: t })} /></View>
              </View>
              <View className="flex-row gap-2">
                <View className="flex-1"><Field label="Country" value={form.country} onChangeText={(t) => setForm({ ...form, country: t })} /></View>
                <View className="flex-1"><Field label="Postal Code" value={form.postal_code} onChangeText={(t) => setForm({ ...form, postal_code: t })} /></View>
              </View>

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
                  {saving ? <ActivityIndicator color="#fff" /> : <Text className="font-black text-white text-sm">{editingUser ? "UPDATE USER" : "CREATE USER"}</Text>}
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </Portal>
  );
};

// ─── View user modal ─────────────────────────────────────────────────────────
const ViewUserModal = ({ visible, user, onClose }) => {
  if (!user) return null;
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
              <Text className="text-lg font-black text-slate-900">User Details</Text>
              <Text className="text-xs text-slate-400 mt-0.5">{user.full_name}</Text>
            </View>
            <TouchableOpacity onPress={onClose} className="w-9 h-9 bg-slate-100 rounded-xl items-center justify-center">
              <Ionicons name="close" size={17} color="#64748b" />
            </TouchableOpacity>
          </View>

          <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 30 }} className="px-5" showsVerticalScrollIndicator={false}>
            {user.profile_image && (
              <>
                <SectionLabel>Profile Photo</SectionLabel>
                <Image source={{ uri: user.profile_image }} className="w-24 h-24 rounded-xl mb-3" />
              </>
            )}

            <SectionLabel>Account</SectionLabel>
            <View className="mb-3"><Text className="text-sm font-semibold text-slate-900">{user.full_name}</Text></View>
            <View className="mb-3"><Text className="text-sm font-semibold text-slate-900">{user.email}</Text></View>
            <View className="mb-3"><Text className="text-sm font-semibold text-slate-900">{user.phone}</Text></View>
            <View className="mb-3"><Text className="text-sm font-semibold text-slate-900">Role: {user.role}</Text></View>
            <View className="mb-3"><Text className="text-sm font-semibold text-slate-900">Status: {user.status}</Text></View>

            {user.date_of_birth && (
              <><SectionLabel>Date of Birth</SectionLabel>
              <View className="mb-3"><Text className="text-sm font-semibold text-slate-900">{user.date_of_birth.split("T")[0]}</Text></View></>
            )}

            <SectionLabel>Location</SectionLabel>
            <View className="mb-3"><Text className="text-sm font-semibold text-slate-900">{user.address || "—"}</Text></View>
            <View className="mb-3"><Text className="text-sm font-semibold text-slate-900">{user.city && user.state ? `${user.city}, ${user.state}` : "—"}</Text></View>
            <View className="mb-3"><Text className="text-sm font-semibold text-slate-900">{user.country || "—"}</Text></View>
            <View className="mb-3"><Text className="text-sm font-semibold text-slate-900">{user.postal_code || "—"}</Text></View>

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
export default function AdminUsers() {
  const {
    users,
    loading:    loadingStates,
    refreshing: refreshingStates,
    getPagination,
    updatePagination,
    getSearchQuery,
    updateSearchQuery,
    fetchUsers,
  } = useAdminData();

  const loading    = loadingStates.users;
  const refreshing = refreshingStates.users;
  const { page, limit, total: totalItems } = getPagination("users");
  const searchQuery = getSearchQuery("users");

  const [searchInput,    setSearchInput]    = useState(searchQuery);
  const [modalVisible,   setModalVisible]   = useState(false);
  const [exportModalVisible, setExportModalVisible] = useState(false);
  const [viewModalVisible, setViewModalVisible] = useState(false);
  const [editingUser,    setEditingUser]    = useState(null);
  const [viewingUser,    setViewingUser]    = useState(null);
  const [saving,         setSaving]         = useState(false);
  const [deleting,       setDeleting]       = useState(false);
  const [exporting,      setExporting]      = useState(false);
  const [form,           setForm]           = useState({ ...EMPTY_FORM });
  const debounceRef = useRef(null);

  useEffect(() => { fetchUsers(); }, [page, limit, searchQuery]);

  const commitSearch = useCallback(
    (text) => updateSearchQuery("users", text),
    [updateSearchQuery],
  );

  const handleSearch = (text) => {
    setSearchInput(text);
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => commitSearch(text), 500);
  };

  const openCreate = () => { setEditingUser(null); setForm({ ...EMPTY_FORM }); setModalVisible(true); };
  const openEdit   = (item) => { setEditingUser(item); setForm(itemToForm(item)); setModalVisible(true); };
  const openView   = (item) => { setViewingUser(item); setViewModalVisible(true); };

  const handleSave = async () => {
    if (!form.full_name.trim() || !form.email.trim() || !form.phone.trim()) {
      return Alert.alert("Required", "Name, Email, and Phone are required.");
    }
    if (!editingUser && !form.password.trim()) {
      return Alert.alert("Required", "Password is required for new users.");
    }

    setSaving(true);
    try {
      const payload = toPayload(form);
      let finalData = payload;

      // If a new image file is selected, use FormData
      if (form.profile_image && form.profile_image.uri && !form.profile_image.uri.startsWith('http')) {
        const fd = new FormData();
        Object.keys(payload).forEach(key => fd.append(key, payload[key]));
        fd.append('profile_image', {
          uri: form.profile_image.uri,
          name: form.profile_image.name || 'profile.jpg',
          type: form.profile_image.type || 'image/jpeg',
        });
        finalData = fd;
      }

      if (editingUser) {
        await updateUser(editingUser.id, finalData);
      } else {
        await createUser(finalData);
      }

      setModalVisible(false);
      fetchUsers(true);
    } catch (e) {
      const msg = e?.response?.data?.message || e.message || "Could not save user.";
      Alert.alert("Error", msg);
    } finally { setSaving(false); }
  };

  const handleDelete = (id, name) => {
    Alert.alert("Remove User", `Delete user "${name}"?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          setDeleting(true);
          try {
            await deleteUser(id);
            fetchUsers(true);
          } catch (e) {
            Alert.alert("Error", "Could not delete user.");
          } finally { setDeleting(false); }
        },
      },
    ]);
  };

  const handleExport = async (type) => {
    setExportModalVisible(false);
    setExporting(true);
    try {
      if (type === "csv") await exportCSV(users);
      if (type === "pdf") await exportPDF(users);
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
            <Text className="text-xl font-black text-white tracking-tight">User Manager</Text>
            <Text className="text-xs text-blue-300 font-semibold mt-0.5">
              {totalItems} user{totalItems !== 1 ? "s" : ""} found
            </Text>
          </View>

          <View className="flex-row items-center gap-2">
            <TouchableOpacity
              onPress={() => setExportModalVisible(true)}
              disabled={exporting || users.length === 0}
              className="w-11 h-11 rounded-xl items-center justify-center"
              style={{ backgroundColor: "rgba(255,255,255,0.15)" }}
            >
              {exporting ? <ActivityIndicator size="small" color="#fff" /> : <Ionicons name="share-outline" size={20} color="#fff" />}
            </TouchableOpacity>
            <TouchableOpacity onPress={openCreate} className="flex-row items-center gap-1.5 bg-white px-4 h-11 rounded-xl">
              <Ionicons name="add-circle" size={17} color="#1e3a8a" />
              <Text className="font-black text-blue-900 text-xs">ADD USER</Text>
            </TouchableOpacity>
          </View>
        </View>

        <Searchbar
          placeholder="Search by name, email, phone..."
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
          <Text className="mt-3 text-slate-400 font-bold text-sm">Loading users...</Text>
        </View>
      ) : (
        <FlatList
          style={{ flex: 1 }}
          data={users}
          keyExtractor={(item) => item.id?.toString()}
          renderItem={({ item, index }) => (
            <UserCard item={item} index={index} onEdit={openEdit} onDelete={handleDelete} onView={openView} />
          )}
          contentContainerStyle={{ flexGrow: 1, paddingTop: 14, paddingBottom: 24 }}
          showsVerticalScrollIndicator={false}
          nestedScrollEnabled={true}
          keyboardShouldPersistTaps="handled"
          ListHeaderComponent={
            <View className="bg-white flex-row border-b border-slate-100">
              {[
                { label: "Total",   val: totalItems },
                { label: "Active",  val: users.filter(u => u.status === "active").length },
                { label: "Inactive",val: users.filter(u => u.status === "inactive").length },
                { label: "Suspended",val: users.filter(u => u.status === "suspended").length },
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
              onRefresh={() => fetchUsers(true)}
              tintColor="#1e3a8a"
              colors={["#1e3a8a"]}
            />
          }
          ListEmptyComponent={() => (
            <View className="items-center pt-24 px-10">
              <MaterialCommunityIcons name="account-remove-outline" size={72} color="#e2e8f0" />
              <Text className="mt-4 text-slate-400 font-extrabold text-base text-center">
                {searchQuery ? `No results for "${searchQuery}"` : "No users found"}
              </Text>
              {!searchQuery && (
                <TouchableOpacity onPress={openCreate} className="mt-5 flex-row items-center gap-2 bg-blue-900 px-6 py-3 rounded-2xl">
                  <Ionicons name="add" size={16} color="#fff" />
                  <Text className="text-white font-black text-sm">Add First User</Text>
                </TouchableOpacity>
              )}
            </View>
          )}
          ListFooterComponent={() =>
            users.length > 0 ? (
              <View className="mx-3 mt-1 mb-6">
                <View className="flex-row items-center justify-between bg-white rounded-2xl px-4 py-3 border border-slate-100">
                  <Text className="text-xs text-slate-400 font-bold">
                    Page {page} / {totalPages} · {users.length} of {totalItems}
                  </Text>
                  <View className="flex-row gap-2">
                    <TouchableOpacity
                      disabled={page <= 1}
                      onPress={() => updatePagination("users", { page: page - 1 })}
                      className={`px-4 py-2 rounded-xl border ${page <= 1 ? "bg-slate-50 border-slate-200" : "bg-blue-900 border-blue-900"}`}
                    >
                      <Text className={`text-xs font-extrabold ${page <= 1 ? "text-slate-300" : "text-white"}`}>← Prev</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      disabled={page >= totalPages}
                      onPress={() => updatePagination("users", { page: page + 1 })}
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
      <UserForm
        visible={modalVisible}
        editingUser={editingUser}
        form={form}
        setForm={setForm}
        saving={saving}
        onSave={handleSave}
        onClose={() => setModalVisible(false)}
      />

      {/* View Modal */}
      <ViewUserModal
        visible={viewModalVisible}
        user={viewingUser}
        onClose={() => setViewModalVisible(false)}
      />

      {/* Export modal */}
      <Portal>
        <Modal
          visible={exportModalVisible}
          onDismiss={() => setExportModalVisible(false)}
          contentContainerStyle={{ backgroundColor: "white", marginHorizontal: 40, borderRadius: 16, padding: 16 }}
        >
          <Text className="text-base font-black text-slate-800 mb-3">Export User Data</Text>
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