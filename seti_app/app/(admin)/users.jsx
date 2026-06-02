import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  View, Text, SafeAreaView, ScrollView, TouchableOpacity,
  ActivityIndicator, Alert, RefreshControl,
  KeyboardAvoidingView, Platform, StatusBar, StyleSheet,
} from "react-native";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { Portal, Modal, TextInput, Searchbar, Dialog, Button } from "react-native-paper";
import * as Print from "expo-print";
import * as Sharing from "expo-sharing";
import * as FileSystem from "expo-file-system";
import Animated, { FadeInDown } from "react-native-reanimated";
import { createUser, deleteUser, updateUser, getUserById, getAllUsersForExport, updateUserStatus } from "../../api/users";
import { useAdminData } from "../../context/AdminContext";

const ROLES = ["passenger", "admin", "super_admin"];
const STATUSES = ["active", "inactive", "suspended"];
const PAGE_SIZES = [10, 25, 50, 100];

const STATUS_CFG = {
  active: { dot: { backgroundColor: "#22C55E" }, badge: { backgroundColor: "#DCFCE7" }, text: { color: "#15803D" }, label: "ACTIVE" },
  inactive: { dot: { backgroundColor: "#EF4444" }, badge: { backgroundColor: "#FEE2E2" }, text: { color: "#B91C1C" }, label: "INACTIVE" },
  suspended: { dot: { backgroundColor: "#EAB308" }, badge: { backgroundColor: "#FEF9C3" }, text: { color: "#A16207" }, label: "SUSPENDED" },
};

const EMPTY_FORM = {
  full_name: "", email: "", phone: "", password: "",
  role: "passenger", status: "active",
  date_of_birth: "", address: "", city: "", state: "", country: "Nepal", postal_code: "",
};

const COLUMNS = [
  { key: "full_name", label: "Name", sortable: true, flex: 1.5 },
  { key: "email", label: "Email", sortable: true, flex: 1.5 },
  { key: "phone", label: "Phone", sortable: true, flex: 1 },
  { key: "role", label: "Role", sortable: true, flex: 0.9 },
  { key: "status", label: "Status", sortable: true, flex: 0.9 },
  { key: "created_at", label: "Created", sortable: true, flex: 0.9 },
  { key: "actions", label: "Actions", sortable: false, flex: 1.2 },
];

const itemToForm = (item) => ({
  full_name: item.full_name ?? "",
  email: item.email ?? "",
  phone: item.phone ?? "",
  password: "",
  role: item.role ?? "passenger",
  status: item.status ?? "active",
  date_of_birth: item.date_of_birth ? item.date_of_birth.split("T")[0] : "",
  address: item.address ?? "",
  city: item.city ?? "",
  state: item.state ?? "",
  country: item.country ?? "Nepal",
  postal_code: item.postal_code ?? "",
});

const toPayload = (f) => {
  const data = {
    full_name: f.full_name,
    email: f.email,
    phone: f.phone || null,
    role: f.role,
    status: f.status,
    date_of_birth: f.date_of_birth || null,
    address: f.address || null,
    city: f.city || null,
    state: f.state || null,
    country: f.country || "Nepal",
    postal_code: f.postal_code || null,
  };
  if (f.password && f.password.trim()) {
    data.password = f.password.trim();
  }
  return data;
};

const formatDate = (d) => {
  if (!d) return "\u2014";
  const dt = new Date(d);
  if (isNaN(dt.getTime())) return "\u2014";
  return dt.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
};

const buildHTML = (users) => `<!DOCTYPE html><html><head><meta charset="utf-8"/>
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
  .suspended{background:#fef9c3;color:#ca8a04}
</style></head><body>
<h1>User Report</h1>
<p>Generated: ${new Date().toLocaleString()} &middot; ${users.length} users</p>
<table>
  <thead><tr>
    <th>#</th><th>Name</th><th>Email</th><th>Phone</th><th>Role</th><th>Status</th>
    <th>Country</th><th>City</th><th>DOB</th>
  </tr></thead>
  <tbody>
    ${users.map((u, i) => `<tr>
      <td>${i + 1}</td>
      <td><strong>${u.full_name}</strong></td>
      <td>${u.email}</td>
      <td>${u.phone || "\u2014"}</td>
      <td>${u.role}</td>
      <td><span class="badge ${u.status}">${u.status}</span></td>
      <td>${u.country || "\u2014"}</td>
      <td>${u.city || "\u2014"}</td>
      <td>${u.date_of_birth?.split("T")[0] || "\u2014"}</td>
    </tr>`).join("")}
  </tbody>
</table></body></html>`;

const buildCSV = (users) => {
  const H = ["ID", "Name", "Email", "Phone", "Role", "Status", "Country", "City", "Address", "Date of Birth", "Postal Code"];
  const E = (v) => `"${String(v ?? "").replace(/"/g, '""')}"`;
  const rows = users.map((u) => [
    u.id, u.full_name, u.email, u.phone, u.role, u.status,
    u.country, u.city, u.address, u.date_of_birth?.split("T")[0], u.postal_code,
  ].map(E).join(","));
  return [H.map(E).join(","), ...rows].join("\r\n");
};

const buildXLS = (users) => {
  const headers = ["ID", "Name", "Email", "Phone", "Role", "Status", "Country", "City", "Address", "Date of Birth", "Postal Code"];
  const rows = users.map((u) => [
    u.id, u.full_name, u.email, u.phone || "", u.role, u.status,
    u.country || "", u.city || "", u.address || "", u.date_of_birth?.split("T")[0] || "", u.postal_code || "",
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
 <Worksheet ss:Name="Users">
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

const exportCSV = async (users) => {
  const csv = buildCSV(users);
  if (Platform.OS === "web") {
    downloadBlob(new Blob([csv], { type: "text/csv;charset=utf-8;" }), `users_${Date.now()}.csv`);
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
    } catch { /* fallback */ }
    await Print.printAsync({ html });
    return;
  }
  const { uri } = await Print.printToFileAsync({ html });
  await shareFile(uri, "application/pdf", "Export PDF");
};

const exportXLS = async (users) => {
  const xls = buildXLS(users);
  if (Platform.OS === "web") {
    downloadBlob(new Blob([xls], { type: "application/vnd.ms-excel;charset=utf-8" }), `users_${Date.now()}.xls`);
    return;
  }
  const path = `${FileSystem.cacheDirectory}users_${Date.now()}.xls`;
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
            : opt === "suspended" ? { backgroundColor: "#EAB308", borderColor: "#EAB308" }
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

const UserForm = ({ visible, editingUser, form, setForm, formErrors, clearFieldError, saving, onSave, onClose }) => {
  const clr = (f) => (v) => { if (clearFieldError) clearFieldError(f); setForm({ ...form, [f]: v }); };
  const roleOptions = ROLES.map((r) => ({ label: r.charAt(0).toUpperCase() + r.slice(1), value: r }));
  return (
  <Portal>
    <Modal visible={visible} onDismiss={onClose} contentContainerStyle={styles.modalContent}>
      <KeyboardAvoidingView style={styles.flex1} behavior={Platform.OS === "ios" ? "padding" : "height"}>
        <View style={styles.flex1}>
          <View style={styles.modalHeader}>
            <View>
              <Text style={styles.modalTitle}>{editingUser ? "Edit User" : "Register User"}</Text>
              <Text style={styles.modalSubtitle}>{editingUser ? `Updating ${editingUser.full_name}` : "Add a new user account"}</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Ionicons name="close" size={17} color="#64748b" />
            </TouchableOpacity>
          </View>
          <ScrollView style={styles.flex1} contentContainerStyle={{ paddingBottom: 30, paddingHorizontal: 20 }}
            showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
            <SectionLabel>Account Information</SectionLabel>
            <Field label="Full Name *" value={form.full_name} error={formErrors?.full_name} onChangeText={clr("full_name")} />
            <Field label="Email *" value={form.email} error={formErrors?.email} onChangeText={clr("email")} keyboardType="email-address" />
            <Field label="Phone *" value={form.phone} error={formErrors?.phone} onChangeText={clr("phone")} keyboardType="phone-pad" />
            <Field label={editingUser ? "Password (leave blank to keep unchanged)" : "Password *"}
              value={form.password} error={formErrors?.password} onChangeText={clr("password")} secureTextEntry />
            <SectionLabel>Role & Status</SectionLabel>
            <View style={styles.dropdownRow}>
              {roleOptions.map((opt) => {
                const on = form.role === opt.value;
                return (
                  <TouchableOpacity key={opt.value} onPress={() => setForm({ ...form, role: opt.value })}
                    style={[styles.roleChip, on ? styles.roleChipActive : styles.roleChipInactive]}>
                    <Text style={[styles.roleChipText, on ? styles.roleChipTextActive : styles.roleChipTextInactive]}>{opt.label}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
            <PillRow options={STATUSES} value={form.status} onChange={(v) => setForm({ ...form, status: v })} />
            <SectionLabel>Personal Details</SectionLabel>
            <Field label="Date of Birth (YYYY-MM-DD)" value={form.date_of_birth} error={formErrors?.date_of_birth} onChangeText={clr("date_of_birth")} />
            <Field label="Address" value={form.address} error={formErrors?.address} onChangeText={clr("address")} />
            <View style={styles.formRow}>
              <View style={styles.formRowItem}><Field label="City" value={form.city} error={formErrors?.city} onChangeText={clr("city")} /></View>
              <View style={styles.formRowItem}><Field label="State" value={form.state} error={formErrors?.state} onChangeText={clr("state")} /></View>
            </View>
            <View style={styles.formRow}>
              <View style={styles.formRowItem}><Field label="Country" value={form.country} error={formErrors?.country} onChangeText={clr("country")} /></View>
              <View style={styles.formRowItem}><Field label="Postal Code" value={form.postal_code} error={formErrors?.postal_code} onChangeText={clr("postal_code")} /></View>
            </View>
            <View style={styles.formActions}>
              <TouchableOpacity onPress={onClose} style={styles.cancelBtn}><Text style={styles.cancelBtnText}>Cancel</Text></TouchableOpacity>
              <TouchableOpacity onPress={onSave} disabled={saving} style={styles.saveBtn}>
                {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.saveBtnText}>{editingUser ? "UPDATE USER" : "SAVE USER"}</Text>}
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
  const form = itemToForm(user);
  return (
    <Portal>
      <Modal visible={visible} onDismiss={onClose} contentContainerStyle={styles.modalContent}>
        <View style={styles.flex1}>
          <View style={styles.modalHeader}>
            <View>
              <Text style={styles.modalTitle}>View User</Text>
              <Text style={styles.modalSubtitle}>Details for {user.full_name}</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Ionicons name="close" size={17} color="#64748b" />
            </TouchableOpacity>
          </View>
          <ScrollView style={styles.flex1} contentContainerStyle={{ paddingBottom: 30, paddingHorizontal: 20 }} showsVerticalScrollIndicator={false}>
            <SectionLabel>Account Information</SectionLabel>
            <View style={styles.viewField}><Text style={styles.viewFieldLabel}>Full Name</Text><Text style={styles.viewFieldValue}>{form.full_name}</Text></View>
            <View style={styles.viewField}><Text style={styles.viewFieldLabel}>Email</Text><Text style={styles.viewFieldValue}>{form.email}</Text></View>
            <View style={styles.viewField}><Text style={styles.viewFieldLabel}>Phone</Text><Text style={styles.viewFieldValue}>{form.phone || "\u2014"}</Text></View>
            <SectionLabel>Role & Status</SectionLabel>
            <View style={styles.viewField}><StatusBadge status={form.status} /></View>
            <View style={styles.viewField}><Text style={[styles.roleLabel, form.role === "super_admin" ? { color: "#7C3AED" } : form.role === "admin" ? { color: "#1E3A8A" } : { color: "#64748B" }]}>{form.role.replace("_", " ").toUpperCase()}</Text></View>
            <SectionLabel>Personal Details</SectionLabel>
            <View style={styles.viewField}><Text style={styles.viewFieldLabel}>Date of Birth</Text><Text style={styles.viewFieldValue}>{form.date_of_birth || "\u2014"}</Text></View>
            <View style={styles.viewField}><Text style={styles.viewFieldLabel}>Address</Text><Text style={styles.viewFieldValue}>{form.address || "\u2014"}</Text></View>
            <View style={styles.formRow}>
              <View style={styles.formRowItem}><Text style={styles.viewFieldLabel}>City</Text><Text style={styles.viewFieldValue}>{form.city || "\u2014"}</Text></View>
              <View style={styles.formRowItem}><Text style={styles.viewFieldLabel}>State</Text><Text style={styles.viewFieldValue}>{form.state || "\u2014"}</Text></View>
            </View>
            <View style={styles.formRow}>
              <View style={styles.formRowItem}><Text style={styles.viewFieldLabel}>Country</Text><Text style={styles.viewFieldValue}>{form.country || "\u2014"}</Text></View>
              <View style={styles.formRowItem}><Text style={styles.viewFieldLabel}>Postal Code</Text><Text style={styles.viewFieldValue}>{form.postal_code || "\u2014"}</Text></View>
            </View>
            <View style={styles.formActions}>
              <TouchableOpacity onPress={onClose} style={styles.cancelBtn}><Text style={styles.cancelBtnText}>Close</Text></TouchableOpacity>
            </View>
          </ScrollView>
        </View>
      </Modal>
    </Portal>
  );
};

export default function AdminUsers() {
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
  const [exportModalVisible, setExportModalVisible] = useState(false);
  const [viewModalVisible, setViewModalVisible] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [viewingUser, setViewingUser] = useState(null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [exportRange, setExportRange] = useState("page");
  const [pageSizeModalVisible, setPageSizeModalVisible] = useState(false);
  const [deleteConfirmVisible, setDeleteConfirmVisible] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [form, setForm] = useState({ ...EMPTY_FORM });
  const [formErrors, setFormErrors] = useState({});
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
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) errors.email = "Invalid email format";
    if (!form.phone.trim()) errors.phone = "Phone is required";
    else if (!/^[0-9]{10}$/.test(form.phone.trim())) errors.phone = "Phone must be 10 digits";
    if (!editingUser && !form.password.trim()) errors.password = "Password is required for new users";
    if (form.password && form.password.trim() && form.password.trim().length < 6) errors.password = "Password must be at least 6 characters";
    if (form.date_of_birth && isNaN(new Date(form.date_of_birth).getTime()))
      errors.date_of_birth = "Invalid date format (use YYYY-MM-DD)";
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
      editingUser ? await updateUser(editingUser.id, toPayload(form)) :
      await createUser(toPayload(form));
      setModalVisible(false);
      setFormErrors({});
      Alert.alert("Success", editingUser ? "User updated successfully!" : "New user added successfully!", [
        { text: "OK", onPress: () => fetchUsers(true) },
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
    finally {
      setSaving(false);
      await fetchUsers(true);
    }
  };

  const handleDelete = (id, name) => {
    if (!id) { Alert.alert("Error", "Invalid user ID. Cannot delete."); return; }
    setDeleteTarget({ id, name });
    setDeleteConfirmVisible(true);
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    const { id } = deleteTarget;
    setDeleting(true);
    setDeleteConfirmVisible(false);
    try {
      await deleteUser(id);
      Alert.alert("Success", "User deleted successfully.", [
        { text: "OK", onPress: () => fetchUsers(true) },
      ]);
    } catch (error) {
      const status = error.response?.status;
      const data = error.response?.data;
      const msg = data?.message || error.message || "Could not delete the user.";
      Alert.alert("Delete Failed", `Status: ${status || "\u2014"}\n${msg}`);
    } finally {
      setDeleting(false);
      setDeleteTarget(null);
      await fetchUsers(true);
    }
  };

  const handleExport = async (type) => {
    setExportModalVisible(false);
    setExporting(true);
    try {
      const exportData = exportRange === "all"
        ? (await getAllUsersForExport()).data.data?.users || users
        : users;
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
          <Text style={styles.cellName} numberOfLines={1}>{item.full_name}</Text>
        </View>
        <View style={[styles.tableCell, { flex: COLUMNS[1].flex }]}>
          <Text style={styles.cellText} numberOfLines={1}>{item.email}</Text>
        </View>
        <View style={[styles.tableCell, { flex: COLUMNS[2].flex }]}>
          <Text style={styles.cellText} numberOfLines={1}>{item.phone || "\u2014"}</Text>
        </View>
        <View style={[styles.tableCell, { flex: COLUMNS[3].flex }]}>
          <View style={[styles.rolePill,
            item.role === "super_admin" ? styles.roleSuperAdmin :
            item.role === "admin" ? styles.roleAdmin :
            styles.rolePassenger
          ]}>
            <Text style={[styles.rolePillText,
              item.role === "super_admin" ? { color: "#7C3AED" } :
              item.role === "admin" ? { color: "#1E3A8A" } :
              { color: "#64748B" }
            ]}>{item.role.replace("_", " ")}</Text>
          </View>
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
            <Text style={styles.headerTitle}>User Manager</Text>
            <Text style={styles.headerCount}>{totalItems} user{totalItems !== 1 ? "s" : ""} registered</Text>
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
          placeholder="Search by name, email, phone..."
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
              { label: "Total", val: totalItems },
              { label: "Active", val: users.filter((u) => u.status === "active").length },
              { label: "Inactive", val: users.filter((u) => u.status === "inactive").length },
              { label: "Suspended", val: users.filter((u) => u.status === "suspended").length },
            ].map(({ label, val }, i, arr) => (
              <View key={label} style={[styles.statBox, i < arr.length - 1 && styles.statBoxBorder]}>
                <Text style={[
                  styles.statValue,
                  label === "Active" ? { color: "#16A34A" } :
                    label === "Inactive" ? { color: "#DC2626" } :
                      label === "Suspended" ? { color: "#CA8A04" } : {}
                ]}>{val}</Text>
                <Text style={styles.statLabel}>{label}</Text>
              </View>
            ))}
          </View>

          <ScrollView horizontal showsHorizontalScrollIndicator={true} style={styles.tableScroll} nestedScrollEnabled={true}>
            <View style={styles.tableContainer}>
              {renderTableHeader()}
              {users.length > 0 ? (
                users.map((item, index) => renderTableRow(item, index))
              ) : (
                <View style={styles.emptyTable}>
                  <MaterialCommunityIcons name="account-remove-outline" size={48} color="#e2e8f0" />
                  <Text style={styles.emptyText}>
                    {searchQuery ? `No results for "${searchQuery}"` : "No Users Found"}
                  </Text>
                  {!searchQuery && (
                    <TouchableOpacity onPress={openCreate} style={styles.emptyAddBtn}>
                      <Ionicons name="add" size={16} color="#fff" />
                      <Text style={styles.emptyAddBtnText}>Add First User</Text>
                    </TouchableOpacity>
                  )}
                </View>
              )}
            </View>
          </ScrollView>

          {users.length > 0 && (
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
        setForm={setForm} formErrors={formErrors} clearFieldError={clearFieldError}
        saving={saving} onSave={handleSave} onClose={() => setModalVisible(false)} />

      <ViewUserModal visible={viewModalVisible} user={viewingUser} onClose={() => setViewModalVisible(false)} />

      <Portal>
        <Modal visible={exportModalVisible} onDismiss={() => setExportModalVisible(false)} contentContainerStyle={styles.exportModal}>
          <Text style={styles.exportModalTitle}>Export User Data</Text>
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

      <Portal>
        <Dialog visible={deleteConfirmVisible} onDismiss={() => { setDeleteConfirmVisible(false); setDeleteTarget(null); }}>
          <Dialog.Title>Remove User</Dialog.Title>
          <Dialog.Content>
            <Text>Delete "{deleteTarget?.name}" from the system?</Text>
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => { setDeleteConfirmVisible(false); setDeleteTarget(null); }}>Cancel</Button>
            <Button onPress={confirmDelete} color="#ef4444">Delete</Button>
          </Dialog.Actions>
        </Dialog>
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
  dropdownRow: { flexDirection: "row", gap: 8, marginBottom: 12 },
  roleChip: { flex: 1, paddingVertical: 10, borderRadius: 14, alignItems: "center", borderWidth: 1 },
  roleChipActive: { backgroundColor: "#1E3A8A", borderColor: "#1E3A8A" },
  roleChipInactive: { backgroundColor: "#F1F5F9", borderColor: "#E2E8F0" },
  roleChipText: { fontSize: 10, fontWeight: "800" },
  roleChipTextActive: { color: "#FFFFFF" },
  roleChipTextInactive: { color: "#64748B" },
  viewField: { marginBottom: 12 },
  viewFieldLabel: { fontSize: 10, fontWeight: "700", color: "#64748B", marginBottom: 4 },
  viewFieldValue: { fontSize: 12, fontWeight: "600", color: "#0F172A" },
  roleLabel: { fontSize: 12, fontWeight: "800", letterSpacing: 1 },
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
  cellName: { fontSize: 12, fontWeight: "900", color: "#0F172A" },
  cellText: { fontSize: 11, fontWeight: "600", color: "#475569" },
  cellDate: { fontSize: 10, fontWeight: "600", color: "#64748B" },
  rolePill: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8, alignSelf: "flex-start" },
  roleSuperAdmin: { backgroundColor: "#F3E8FF" },
  roleAdmin: { backgroundColor: "#DBEAFE" },
  rolePassenger: { backgroundColor: "#F1F5F9" },
  rolePillText: { fontSize: 9, fontWeight: "800", textTransform: "uppercase", letterSpacing: 0.5 },
  actionBtn: {
    width: 28, height: 28, borderRadius: 8, backgroundColor: "#F1F5F9",
    alignItems: "center", justifyContent: "center",
  },
});
