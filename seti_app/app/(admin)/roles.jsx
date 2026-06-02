import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  View, Text, SafeAreaView, ScrollView, TouchableOpacity,
  ActivityIndicator, Alert, RefreshControl,
  KeyboardAvoidingView, Platform, StatusBar, StyleSheet,
} from "react-native";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { Portal, Modal, TextInput, Searchbar, Menu } from "react-native-paper";
import * as Print from "expo-print";
import * as Sharing from "expo-sharing";
import * as FileSystem from "expo-file-system";
import Animated, { FadeInDown } from "react-native-reanimated";
import { createUser, deleteUser, updateUser } from "../../api/users";
import { useAdminData } from "../../context/AdminContext";
import { USER_ROLES } from "../../utils/constants";

const ROLES = [USER_ROLES.PASSENGER, USER_ROLES.ADMIN, USER_ROLES.SUPER_ADMIN];
const STATUSES = ["active", "inactive", "suspended"];
const PAGE_SIZES = [10, 25, 50, 100];

const STATUS_CFG = {
  active:    { dot: { backgroundColor: "#22C55E" }, badge: { backgroundColor: "#DCFCE7" }, text: { color: "#15803D" }, label: "ACTIVE" },
  inactive:  { dot: { backgroundColor: "#EF4444" }, badge: { backgroundColor: "#FEE2E2" }, text: { color: "#B91C1C" }, label: "INACTIVE" },
  suspended: { dot: { backgroundColor: "#EAB308" }, badge: { backgroundColor: "#FEF9C3" }, text: { color: "#A16207" }, label: "SUSPENDED" },
};

const ROLE_CFG = {
  [USER_ROLES.PASSENGER]:  { badge: { backgroundColor: "#F1F5F9" }, text: { color: "#475569" }, label: "PASSENGER" },
  [USER_ROLES.ADMIN]:      { badge: { backgroundColor: "#DBEAFE" }, text: { color: "#1D4ED8" }, label: "ADMIN" },
  [USER_ROLES.SUPER_ADMIN]: { badge: { backgroundColor: "#EDE9FE" }, text: { color: "#6D28D9" }, label: "SUPER ADMIN" },
};

const AVATAR_COLORS = ["#3B82F6", "#10B981", "#8B5CF6", "#F59E0B", "#F43F5E", "#06B6D4"];

const EMPTY_FORM = {
  email: "", phone: "", full_name: "", password: "",
  role: USER_ROLES.PASSENGER, status: "active",
};

const COLUMNS = [
  { key: "id", label: "ID", sortable: true, flex: 0.5 },
  { key: "full_name", label: "Name", sortable: true, flex: 1.2 },
  { key: "email", label: "Email", sortable: true, flex: 1.3 },
  { key: "phone", label: "Phone", sortable: true, flex: 0.9 },
  { key: "role", label: "Role", sortable: true, flex: 0.9 },
  { key: "status", label: "Status", sortable: true, flex: 0.8 },
  { key: "created_at", label: "Created", sortable: true, flex: 0.8 },
  { key: "actions", label: "Actions", sortable: false, flex: 1 },
];

const formatDate = (d) => {
  if (!d) return "\u2014";
  const dt = new Date(d);
  if (isNaN(dt.getTime())) return "\u2014";
  return dt.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
};

const itemToForm = (item) => ({
  email: item.email ?? "",
  phone: item.phone ?? "",
  full_name: item.full_name ?? "",
  password: "",
  role: item.role ?? USER_ROLES.PASSENGER,
  status: item.status ?? "active",
});

const toPayload = (f) => {
  const data = {
    email: f.email, phone: f.phone, full_name: f.full_name,
    role: f.role, status: f.status,
  };
  if (f.password && f.password.trim()) data.password = f.password.trim();
  return data;
};

const buildHTML = (users) => {
  const H = ["ID", "Name", "Email", "Phone", "Role", "Status", "Created"];
  const E = (v) => String(v ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  const rows = users.map((u, i) => `<tr>
    <td>${i + 1}</td>
    <td><strong>${E(u.full_name)}</strong></td>
    <td>${E(u.email)}</td>
    <td>${E(u.phone)}</td>
    <td><span class="badge ${u.role}">${E(u.role)}</span></td>
    <td><span class="badge ${u.status}">${E(u.status)}</span></td>
    <td>${formatDate(u.created_at)}</td>
  </tr>`).join("");
  return `<!DOCTYPE html><html><head><meta charset="utf-8"/>
  <style>
    body{font-family:Arial,sans-serif;padding:28px;color:#1e293b}
    h1{color:#1e3a8a;font-size:22px;font-weight:900;margin:0}
    p{color:#64748b;font-size:12px;margin:4px 0 24px}
    table{width:100%;border-collapse:collapse;font-size:11px}
    th{background:#1e3a8a;color:#fff;padding:8px 10px;text-align:left;font-size:9px;text-transform:uppercase}
    td{padding:7px 10px;border-bottom:1px solid #e2e8f0}
    tr:nth-child(even) td{background:#f8fafc}
    .badge{display:inline-block;padding:2px 8px;border-radius:12px;font-size:9px;font-weight:700;text-transform:uppercase}
    .passenger,.active{background:#dcfce7;color:#16a34a}
    .admin{background:#dbeafe;color:#1d4ed8}
    .super_admin{background:#ede9fe;color:#6d28d9}
    .inactive{background:#fee2e2;color:#dc2626}
    .suspended{background:#fef9c3;color:#ca8a04}
  </style></head><body>
  <h1>Role Management Report</h1>
  <p>Generated: ${new Date().toLocaleString()} &middot; ${users.length} entries</p>
  <table><thead><tr>${H.map(h => `<th>${h}</th>`).join("")}</tr></thead>
  <tbody>${rows}</tbody></table></body></html>`;
};

const buildCSV = (users) => {
  const H = ["ID", "Name", "Email", "Phone", "Role", "Status", "Created"];
  const E = (v) => `"${String(v ?? "").replace(/"/g, '""')}"`;
  const rows = users.map((u) => [u.id, u.full_name, u.email, u.phone, u.role, u.status, formatDate(u.created_at)].map(E).join(","));
  return [H.map(E).join(","), ...rows].join("\r\n");
};

const shareFile = async (path, mimeType, dialogTitle) => {
  let uri = path;
  if (Platform.OS === "android") {
    try { const contentUri = await FileSystem.getContentUriAsync(path); uri = contentUri.uri; }
    catch { uri = path; }
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

const exportCSV = async (users) => {
  const csv = buildCSV(users);
  if (Platform.OS === "web") {
    downloadBlob(new Blob([csv], { type: "text/csv;charset=utf-8;" }), `roles_${Date.now()}.csv`);
    return;
  }
  const path = `${FileSystem.cacheDirectory}roles_${Date.now()}.csv`;
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
        anchor.download = `roles_${Date.now()}.pdf`;
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

const SectionLabel = ({ children }) => <Text style={styles.sectionLabel}>{children}</Text>;

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

const Avatar = ({ name, size = 36 }) => {
  const initials = name
    ? name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2)
    : "??";
  const colorIndex = initials.length % AVATAR_COLORS.length;
  return (
    <View style={[styles.avatar, { width: size, height: size, borderRadius: size / 2, backgroundColor: AVATAR_COLORS[colorIndex] }]}>
      <Text style={[styles.avatarText, { fontSize: size * 0.35 }]}>{initials}</Text>
    </View>
  );
};

const RoleBadge = ({ role }) => {
  const cfg = ROLE_CFG[role] || ROLE_CFG[USER_ROLES.PASSENGER];
  return (
    <View style={[styles.roleBadge, cfg.badge]}>
      <Text style={[styles.roleBadgeText, cfg.text]}>{cfg.label}</Text>
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

const PillRow = ({ options, value, onChange }) => {
  const activeBgMap = {
    active:    { backgroundColor: "#16A34A", borderColor: "#16A34A" },
    inactive:  { backgroundColor: "#DC2626", borderColor: "#DC2626" },
    suspended: { backgroundColor: "#EAB308", borderColor: "#EAB308" },
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

const UserForm = ({ visible, editingUser, form, setForm, saving, onSave, onClose }) => {
  const roleOptions = ROLES.map(r => ({ label: r.replace("_", " ").replace(/\b\w/g, l => l.toUpperCase()), value: r }));
  return (
    <Portal>
      <Modal visible={visible} onDismiss={onClose} contentContainerStyle={styles.modalContent}>
        <KeyboardAvoidingView style={styles.flex1} behavior={Platform.OS === "ios" ? "padding" : "height"}>
          <View style={styles.flex1}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalTitle}>{editingUser ? "Edit User" : "New User"}</Text>
                <Text style={styles.modalSubtitle}>
                  {editingUser ? `Updating ${editingUser.full_name}` : "Create a new user account"}
                </Text>
              </View>
              <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
                <Ionicons name="close" size={17} color="#64748b" />
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.flex1} contentContainerStyle={{ paddingBottom: 30, paddingHorizontal: 20 }}
              showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
              <SectionLabel>Account Information</SectionLabel>
              <Field label="Full Name *" value={form.full_name} onChangeText={(t) => setForm({ ...form, full_name: t })} />
              <Field label="Email *" value={form.email} onChangeText={(t) => setForm({ ...form, email: t })} keyboardType="email-address" />
              <Field label="Phone *" value={form.phone} onChangeText={(t) => setForm({ ...form, phone: t })} keyboardType="phone-pad" />
              <Field label={editingUser ? "Password (leave blank to keep unchanged)" : "Password *"}
                value={form.password} onChangeText={(t) => setForm({ ...form, password: t })} secureTextEntry />

              <SectionLabel>Role & Status</SectionLabel>
              <Dropdown label="Role" value={form.role} options={roleOptions} onSelect={(v) => setForm({ ...form, role: v })} />
              <PillRow options={STATUSES} value={form.status} onChange={(v) => setForm({ ...form, status: v })} />

              <View style={styles.formActions}>
                <TouchableOpacity onPress={onClose} style={styles.cancelBtn}><Text style={styles.cancelBtnText}>Cancel</Text></TouchableOpacity>
                <TouchableOpacity onPress={onSave} disabled={saving} style={styles.saveBtn}>
                  {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.saveBtnText}>{editingUser ? "UPDATE USER" : "CREATE USER"}</Text>}
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </Portal>
  );
};

const ViewUserModal = ({ visible, user, onClose }) => {
  if (!user) return null;
  return (
    <Portal>
      <Modal visible={visible} onDismiss={onClose} contentContainerStyle={styles.modalContent}>
        <View style={styles.flex1}>
          <View style={styles.modalHeader}>
            <View>
              <Text style={styles.modalTitle}>User Details</Text>
              <Text style={styles.modalSubtitle}>{user.full_name}</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Ionicons name="close" size={17} color="#64748b" />
            </TouchableOpacity>
          </View>
          <ScrollView style={styles.flex1} contentContainerStyle={{ paddingBottom: 30, paddingHorizontal: 20 }} showsVerticalScrollIndicator={false}>
            <View style={styles.viewUserTop}>
              <Avatar name={user.full_name} size={56} />
              <View style={styles.viewUserInfo}>
                <Text style={styles.viewUserInfoName}>{user.full_name}</Text>
                <View style={styles.viewUserBadges}>
                  <RoleBadge role={user.role} />
                  <StatusBadge status={user.status} />
                </View>
              </View>
            </View>

            <SectionLabel>Contact</SectionLabel>
            <View style={styles.viewField}><Text style={styles.viewFieldLabel}>Email</Text><Text style={styles.viewFieldValue}>{user.email}</Text></View>
            <View style={styles.viewField}><Text style={styles.viewFieldLabel}>Phone</Text><Text style={styles.viewFieldValue}>{user.phone || "\u2014"}</Text></View>

            <SectionLabel>Account</SectionLabel>
            <View style={styles.viewField}><Text style={styles.viewFieldLabel}>User ID</Text><Text style={styles.viewFieldValue}>#{user.id}</Text></View>
            <View style={styles.viewField}><Text style={styles.viewFieldLabel}>Email Verified</Text>
              <Text style={[styles.viewFieldValue, { color: user.is_email_verified ? "#16A34A" : "#DC2626" }]}>
                {user.is_email_verified ? "Verified" : "Not Verified"}
              </Text>
            </View>
            <View style={styles.viewField}><Text style={styles.viewFieldLabel}>Created</Text><Text style={styles.viewFieldValue}>{formatDate(user.created_at)}</Text></View>
            {user.last_login_at && (
              <View style={styles.viewField}><Text style={styles.viewFieldLabel}>Last Login</Text><Text style={styles.viewFieldValue}>{formatDate(user.last_login_at)}</Text></View>
            )}

            <View style={styles.formActions}>
              <TouchableOpacity onPress={onClose} style={styles.cancelBtn}><Text style={styles.cancelBtnText}>Close</Text></TouchableOpacity>
            </View>
          </ScrollView>
        </View>
      </Modal>
    </Portal>
  );
};

export default function AdminRoles() {
  const {
    users,
    loading: loadingStates,
    refreshing: refreshingStates,
    getPagination,
    updatePagination,
    getSearchQuery,
    updateSearchQuery,
    getSort,
    updateSort,
    fetchUsers,
  } = useAdminData();

  const loading = loadingStates.users;
  const refreshing = refreshingStates.users;
  const { page, limit, total: totalItems } = getPagination("users");
  const searchQuery = getSearchQuery("users");
  const { sortBy, sortOrder } = getSort("users");

  const [searchInput, setSearchInput] = useState(searchQuery);
  const [modalVisible, setModalVisible] = useState(false);
  const [viewModalVisible, setViewModalVisible] = useState(false);
  const [exportModalVisible, setExportModalVisible] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [viewingUser, setViewingUser] = useState(null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [pageSizeModalVisible, setPageSizeModalVisible] = useState(false);
  const [form, setForm] = useState({ ...EMPTY_FORM });
  const [formErrors, setFormErrors] = useState({});
  const [roleFilter, setRoleFilter] = useState(null);
  const [statusFilter, setStatusFilter] = useState(null);
  const [roleFilterVisible, setRoleFilterVisible] = useState(false);
  const debounceRef = useRef(null);

  useEffect(() => { fetchUsers(); }, [page, limit, searchQuery, sortBy, sortOrder]);

  const commitSearch = useCallback((text) => updateSearchQuery("users", text), [updateSearchQuery]);

  const handleSearch = (text) => {
    setSearchInput(text);
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => commitSearch(text), 500);
  };

  const handleSort = (column) => {
    if (!column.sortable) return;
    const currentSort = getSort("users");
    if (currentSort.sortBy === column.key) {
      updateSort("users", column.key, currentSort.sortOrder === "ASC" ? "DESC" : "ASC");
    } else {
      updateSort("users", column.key, "ASC");
    }
  };

  const handlePageSizeChange = (newSize) => {
    updatePagination("users", { limit: newSize, page: 1 });
    setPageSizeModalVisible(false);
  };

  const openCreate = () => { setEditingUser(null); setForm({ ...EMPTY_FORM }); setFormErrors({}); setModalVisible(true); };
  const openEdit = (item) => { setEditingUser(item); setForm(itemToForm(item)); setFormErrors({}); setModalVisible(true); };
  const openView = (item) => { setViewingUser(item); setViewModalVisible(true); };

  const validateForm = () => {
    const errors = {};
    if (!form.full_name.trim()) errors.full_name = "Full name is required";
    if (!form.email.trim()) errors.email = "Email is required";
    if (!form.phone.trim()) errors.phone = "Phone is required";
    if (!editingUser && !form.password.trim()) errors.password = "Password is required";
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
      if (editingUser) {
        await updateUser(editingUser.id, toPayload(form));
      } else {
        await createUser(toPayload(form));
      }
      setModalVisible(false);
      setFormErrors({});
      Alert.alert("Success", editingUser ? "User updated successfully!" : "User created successfully!", [
        { text: "OK", onPress: () => fetchUsers(true) },
      ]);
    } catch (err) {
      const data = err.response?.data;
      const msg = data?.message || "Could not save. Please try again.";
      if (data?.fields && typeof data.fields === 'object') setFormErrors(data.fields);
      Alert.alert("Error", msg);
    } finally {
      setSaving(false);
      await fetchUsers(true);
    }
  };

  const handleDelete = (id, name) => {
    if (Platform.OS === "web") {
      if (window.confirm(`Delete user "${name}"?`)) {
        setDeleting(true);
        deleteUser(id).then(() => {
          Alert.alert("Success", "User deleted successfully.");
        }).catch((error) => {
          const msg = error.response?.data?.message || error.message || "Could not delete the user.";
          Alert.alert("Delete Failed", msg);
        }).finally(() => {
          setDeleting(false);
          fetchUsers(true);
        });
      }
      return;
    }
    Alert.alert("Remove User", `Delete user "${name}"?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete", style: "destructive", onPress: async () => {
          setDeleting(true);
          try {
            await deleteUser(id);
            Alert.alert("Success", "User deleted successfully.");
          } catch (error) {
            const msg = error.response?.data?.message || error.message || "Could not delete the user.";
            Alert.alert("Delete Failed", msg);
          } finally {
            setDeleting(false);
            await fetchUsers(true);
          }
        }
      },
    ]);
  };

  const handleExport = async (type) => {
    setExportModalVisible(false);
    setExporting(true);
    try {
      if (type === "csv") await exportCSV(filteredUsers);
      if (type === "pdf") await exportPDF(filteredUsers);
    } catch (e) { Alert.alert("Export Failed", e.message || "Something went wrong."); }
    finally { setExporting(false); }
  };

  const filteredUsers = users.filter((u) => {
    if (roleFilter && u.role !== roleFilter) return false;
    if (statusFilter && u.status !== statusFilter) return false;
    return true;
  });

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
    const current = getSort("users");
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

  const roleFilterOptions = [
    { label: "All Roles", value: null },
    ...ROLES.map(r => ({ label: r.replace("_", " ").replace(/\b\w/g, l => l.toUpperCase()), value: r })),
  ];

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
          <Text style={styles.cellId}>#{item.id}</Text>
        </View>
        <View style={[styles.tableCell, { flex: COLUMNS[1].flex, flexDirection: "row", alignItems: "center", gap: 8 }]}>
          <Avatar name={item.full_name} size={28} />
          <Text style={styles.cellName} numberOfLines={1}>{item.full_name}</Text>
        </View>
        <View style={[styles.tableCell, { flex: COLUMNS[2].flex }]}>
          <Text style={styles.cellText} numberOfLines={1}>{item.email}</Text>
        </View>
        <View style={[styles.tableCell, { flex: COLUMNS[3].flex }]}>
          <Text style={styles.cellText}>{item.phone || "\u2014"}</Text>
        </View>
        <View style={[styles.tableCell, { flex: COLUMNS[4].flex }]}>
          <RoleBadge role={item.role} />
        </View>
        <View style={[styles.tableCell, { flex: COLUMNS[5].flex }]}>
          <StatusBadge status={item.status} />
        </View>
        <View style={[styles.tableCell, { flex: COLUMNS[6].flex }]}>
          <Text style={styles.cellDate}>{formatDate(item.created_at)}</Text>
        </View>
        <View style={[styles.tableCell, { flex: COLUMNS[7].flex, flexDirection: "row", gap: 4 }]}>
          <TouchableOpacity onPress={() => openView(item)} style={styles.actionBtn}>
            <Ionicons name="eye-outline" size={13} color="#1e3a8a" />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => openEdit(item)} style={styles.actionBtn}>
            <Ionicons name="pencil-outline" size={13} color="#475569" />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => handleDelete(item.id || item._id, item.full_name)}
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
            <Text style={styles.headerTitle}>Role Management</Text>
            <Text style={styles.headerCount}>{totalItems} user{totalItems !== 1 ? "s" : ""} found</Text>
          </View>
          <View style={styles.headerActions}>
            <TouchableOpacity onPress={() => setExportModalVisible(true)}
              disabled={exporting || users.length === 0} style={styles.exportBtn}>
              {exporting ? <ActivityIndicator size="small" color="#fff" /> : <Ionicons name="share-outline" size={20} color="#fff" />}
            </TouchableOpacity>
            <TouchableOpacity onPress={openCreate} style={styles.addBtn}>
              <Ionicons name="add-circle" size={17} color="#1e3a8a" />
              <Text style={styles.addBtnText}>ADD USER</Text>
            </TouchableOpacity>
          </View>
        </View>
        <Searchbar
          placeholder="Search by name, email or phone..."
          onChangeText={handleSearch}
          value={searchInput}
          elevation={0}
          style={styles.searchbar}
          inputStyle={styles.searchbarInput}
          placeholderTextColor="rgba(255,255,255,0.4)"
          iconColor="rgba(255,255,255,0.6)"
        />
      </View>

      <View style={styles.filterBar}>
        <Menu visible={roleFilterVisible} onDismiss={() => setRoleFilterVisible(false)}
          anchor={
            <TouchableOpacity onPress={() => setRoleFilterVisible(true)} style={styles.filterDropdown}>
              <Ionicons name="funnel-outline" size={14} color="#1e3a8a" />
              <Text style={styles.filterDropdownText}>
                {roleFilter ? roleFilter.replace("_", " ").replace(/\b\w/g, l => l.toUpperCase()) : "All Roles"}
              </Text>
              <Ionicons name="chevron-down" size={12} color="#64748b" />
            </TouchableOpacity>
          }>
          {roleFilterOptions.map((opt) => (
            <Menu.Item key={opt.value || "all"} title={opt.label}
              onPress={() => { setRoleFilter(opt.value); setRoleFilterVisible(false); }} />
          ))}
        </Menu>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flex: 1 }}>
          <View style={styles.filterPills}>
            <TouchableOpacity onPress={() => setStatusFilter(null)}
              style={[styles.filterPill, !statusFilter && styles.filterPillActive]}>
              <Text style={[styles.filterPillText, !statusFilter && styles.filterPillTextActive]}>All</Text>
            </TouchableOpacity>
            {STATUSES.map((s) => {
              const active = statusFilter === s;
              const colorMap = { active: "#16A34A", inactive: "#DC2626", suspended: "#EAB308" };
              return (
                <TouchableOpacity key={s} onPress={() => setStatusFilter(active ? null : s)}
                  style={[styles.filterPill, active && { backgroundColor: colorMap[s], borderColor: colorMap[s] }]}>
                  <Text style={[styles.filterPillText, active && { color: "#fff" }]}>{s}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </ScrollView>
      </View>

      {loading && !refreshing ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator color="#1e3a8a" size="large" />
          <Text style={styles.loadingText}>Loading users...</Text>
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
              onRefresh={() => fetchUsers(true)}
              tintColor="#1e3a8a"
              colors={["#1e3a8a"]}
            />
          }
        >
          <View style={styles.statsBar}>
            {[
              { label: "Total", val: totalItems, color: "#1E3A8A" },
              { label: "Passenger", val: users.filter((u) => u.role === USER_ROLES.PASSENGER).length, color: "#475569" },
              { label: "Admin", val: users.filter((u) => u.role === USER_ROLES.ADMIN).length, color: "#1D4ED8" },
              { label: "Super Admin", val: users.filter((u) => u.role === USER_ROLES.SUPER_ADMIN).length, color: "#6D28D9" },
              { label: "Active", val: users.filter((u) => u.status === "active").length, color: "#16A34A" },
              { label: "Inactive", val: users.filter((u) => u.status === "inactive").length, color: "#DC2626" },
            ].map(({ label, val, color }, i, arr) => (
              <View key={label} style={[styles.statBox, i < arr.length - 1 && styles.statBoxBorder]}>
                <Text style={[styles.statValue, { color }]}>{val}</Text>
                <Text style={styles.statLabel}>{label}</Text>
              </View>
            ))}
          </View>

          <ScrollView horizontal showsHorizontalScrollIndicator={true} style={styles.tableScroll} nestedScrollEnabled={true}>
            <View style={styles.tableContainer}>
              {renderTableHeader()}
              {filteredUsers.length > 0 ? (
                filteredUsers.map((item, index) => renderTableRow(item, index))
              ) : (
                <View style={styles.emptyTable}>
                  <MaterialCommunityIcons name="shield-off-outline" size={48} color="#e2e8f0" />
                  <Text style={styles.emptyText}>
                    {searchQuery ? `No results for "${searchQuery}"` : "No users found"}
                  </Text>
                  {!searchQuery && !roleFilter && !statusFilter && (
                    <TouchableOpacity onPress={openCreate} style={styles.emptyAddBtn}>
                      <Ionicons name="add" size={16} color="#fff" />
                      <Text style={styles.emptyAddBtnText}>Add First User</Text>
                    </TouchableOpacity>
                  )}
                </View>
              )}
            </View>
          </ScrollView>

          {filteredUsers.length > 0 && (
            <View style={styles.footerContainer}>
              <View style={styles.footerRow}>
                <TouchableOpacity onPress={() => setPageSizeModalVisible(true)} style={styles.pageSizeBtn}>
                  <Text style={styles.pageSizeText}>{limit} rows</Text>
                  <Ionicons name="chevron-down" size={12} color="#64748b" />
                </TouchableOpacity>
                <Text style={styles.entriesInfo}>Showing {startEntry} to {endEntry} of {totalItems} entries</Text>
                <View style={styles.pagination}>
                  <TouchableOpacity disabled={page <= 1}
                    onPress={() => updatePagination("users", { page: page - 1 })}
                    style={[styles.paginationBtn, page <= 1 ? styles.paginationBtnDisabled : styles.paginationBtnActive]}>
                    <Text style={[styles.paginationBtnText, page <= 1 ? styles.paginationTextDisabled : styles.paginationTextActive]}>Prev</Text>
                  </TouchableOpacity>
                  {getPageNumbers().map((p) => (
                    <TouchableOpacity key={p} onPress={() => updatePagination("users", { page: p })}
                      style={[styles.pageNumBtn, p === page && styles.pageNumBtnActive]}>
                      <Text style={[styles.pageNumText, p === page && styles.pageNumTextActive]}>{p}</Text>
                    </TouchableOpacity>
                  ))}
                  <TouchableOpacity disabled={page >= totalPages}
                    onPress={() => updatePagination("users", { page: page + 1 })}
                    style={[styles.paginationBtn, page >= totalPages ? styles.paginationBtnDisabled : styles.paginationBtnActive]}>
                    <Text style={[styles.paginationBtnText, page >= totalPages ? styles.paginationTextDisabled : styles.paginationTextActive]}>Next</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          )}
        </ScrollView>
      )}

      <UserForm visible={modalVisible} editingUser={editingUser} form={form}
        setForm={setForm} saving={saving} onSave={handleSave} onClose={() => setModalVisible(false)} />

      <ViewUserModal visible={viewModalVisible} user={viewingUser}
        onClose={() => setViewModalVisible(false)} />

      <Portal>
        <Modal visible={exportModalVisible} onDismiss={() => setExportModalVisible(false)} contentContainerStyle={styles.exportModal}>
          <Text style={styles.exportModalTitle}>Export Role Data</Text>
          {[
            { key: "csv", icon: "grid-outline", label: "Export CSV" },
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
  avatar: { alignItems: "center", justifyContent: "center" },
  avatarText: { color: "#FFFFFF", fontWeight: "900" },
  roleBadge: { paddingHorizontal: 10, paddingVertical: 3, borderRadius: 9999, alignSelf: "flex-start" },
  roleBadgeText: { fontSize: 9, fontWeight: "900", textTransform: "uppercase" },
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
  viewUserTop: { flexDirection: "row", alignItems: "center", gap: 16, paddingVertical: 16, paddingHorizontal: 20 },
  viewUserInfo: { flex: 1 },
  viewUserInfoName: { fontSize: 16, fontWeight: "900", color: "#0F172A" },
  viewUserBadges: { flexDirection: "row", gap: 6, marginTop: 8 },
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
  filterBar: {
    flexDirection: "row", alignItems: "center", backgroundColor: "#FFFFFF",
    paddingHorizontal: 16, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: "#F1F5F9", gap: 10,
  },
  filterDropdown: {
    flexDirection: "row", alignItems: "center", gap: 6,
    backgroundColor: "#F8FAFC", paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10,
    borderWidth: 1, borderColor: "#E2E8F0",
  },
  filterDropdownText: { fontSize: 10, fontWeight: "700", color: "#1e3a8a" },
  filterPills: { flexDirection: "row", gap: 6, alignItems: "center" },
  filterPill: {
    paddingHorizontal: 12, paddingVertical: 6, borderRadius: 9999,
    borderWidth: 1, borderColor: "#E2E8F0", backgroundColor: "#F8FAFC",
  },
  filterPillActive: { backgroundColor: "#1E3A8A", borderColor: "#1E3A8A" },
  filterPillText: { fontSize: 10, fontWeight: "700", color: "#64748B" },
  filterPillTextActive: { color: "#FFFFFF" },
  loadingContainer: { flex: 1, alignItems: "center", justifyContent: "center" },
  loadingText: { marginTop: 12, color: "#94A3B8", fontWeight: "700", fontSize: 12 },
  statsBar: {
    backgroundColor: "#FFFFFF", flexDirection: "row", borderBottomWidth: 1, borderBottomColor: "#F1F5F9",
  },
  statBox: { flex: 1, alignItems: "center", paddingVertical: 12 },
  statBoxBorder: { borderRightWidth: 1, borderRightColor: "#F1F5F9" },
  statValue: { fontSize: 18, fontWeight: "900" },
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
  exportCancel: { marginTop: 8, alignItems: "center", paddingVertical: 8 },
  exportCancelText: { fontSize: 10, fontWeight: "700", color: "#94A3B8" },
  pageSizeModal: { backgroundColor: "white", marginHorizontal: 100, borderRadius: 16, padding: 16 },
  pageSizeOption: { paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: "#F1F5F9", alignItems: "center" },
  pageSizeOptionActive: { backgroundColor: "#EFF6FF" },
  pageSizeOptionText: { fontSize: 14, fontWeight: "700", color: "#1E293B" },
  pageSizeOptionTextActive: { color: "#1E3A8A" },
  tableScroll: { flex: 1 },
  tableContainer: { minWidth: 850, paddingHorizontal: 12 },
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
  cellId: { fontSize: 10, fontWeight: "700", color: "#94A3B8" },
  cellName: { fontSize: 12, fontWeight: "900", color: "#0F172A", flex: 1 },
  cellText: { fontSize: 11, fontWeight: "600", color: "#475569" },
  cellDate: { fontSize: 10, fontWeight: "600", color: "#64748B" },
  actionBtn: {
    width: 28, height: 28, borderRadius: 8, backgroundColor: "#F1F5F9",
    alignItems: "center", justifyContent: "center",
  },
});
