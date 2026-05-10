import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  View, Text, SafeAreaView, ScrollView, TouchableOpacity,
  ActivityIndicator, Alert, FlatList, RefreshControl,
  KeyboardAvoidingView, Platform, StatusBar, Image, StyleSheet,
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

const ROLES  = ["passenger", "admin", "super_admin"];
const STATUSES = ["active", "inactive", "suspended"];

const STATUS_CFG = {
  active:    { dot: { backgroundColor: '#22C55E' }, badge: { backgroundColor: '#DCFCE7' }, text: { color: '#15803D' }, label: "ACTIVE"    },
  inactive:  { dot: { backgroundColor: '#EF4444' }, badge: { backgroundColor: '#FEE2E2' }, text: { color: '#B91C1C' }, label: "INACTIVE"  },
  suspended: { dot: { backgroundColor: '#EAB308' }, badge: { backgroundColor: '#FEF9C3' }, text: { color: '#A16207' }, label: "SUSPENDED" },
};

const EMPTY_FORM = {
  email: "", phone: "", full_name: "", password: "",
  role: "passenger", status: "active",
  profile_image: null, date_of_birth: "", address: "",
  city: "", state: "", country: "Nepal", postal_code: "",
};

const itemToForm = (item) => ({
  email: item.email ?? "", phone: item.phone ?? "",
  full_name: item.full_name ?? "", password: "",
  role: item.role ?? "passenger", status: item.status ?? "active",
  profile_image: item.profile_image ? { uri: item.profile_image } : null,
  date_of_birth: item.date_of_birth ? item.date_of_birth.split("T")[0] : "",
  address: item.address ?? "", city: item.city ?? "",
  state: item.state ?? "", country: item.country ?? "Nepal",
  postal_code: item.postal_code ?? "",
});

const toPayload = (form) => {
  const data = {
    email: form.email, phone: form.phone, full_name: form.full_name,
    role: form.role, status: form.status,
    date_of_birth: form.date_of_birth || null,
    address: form.address || null, city: form.city || null,
    state: form.state || null, country: form.country || "Nepal",
    postal_code: form.postal_code || null,
  };
  if (form.password && form.password.trim()) {
    data.password = form.password.trim();
  }
  return data;
};
const buildHTML = (users) => '<!DOCTYPE html><html><head><meta charset="utf-8"/>' +
'<style>body{font-family:Arial,sans-serif;padding:28px;color:#1e293b}' +
'h1{color:#1e3a8a;font-size:22px;font-weight:900;margin:0}' +
'p{color:#64748b;font-size:12px;margin:4px 0 24px}' +
'table{width:100%;border-collapse:collapse;font-size:11px}' +
'th{background:#1e3a8a;color:#fff;padding:8px 10px;text-align:left;font-size:9px;text-transform:uppercase}' +
'td{padding:7px 10px;border-bottom:1px solid #e2e8f0}' +
'tr:nth-child(even) td{background:#f8fafc}' +
'.badge{display:inline-block;padding:2px 8px;border-radius:12px;font-size:9px;font-weight:700}' +
'.active{background:#dcfce7;color:#16a34a}' +
'.inactive{background:#fee2e2;color:#dc2626}' +
'.suspended{background:#fef9c3;color:#ca8a04}' +
'</style></head><body>' +
'<h1>User Report</h1>' +
'<p>Generated: ' + new Date().toLocaleString() + ' ' + users.length + ' users</p>' +
'<table><thead><tr><th>#</th><th>Name</th><th>Email</th><th>Phone</th><th>Role</th><th>Status</th><th>Country</th></tr></thead><tbody>' +
users.map((u, i) => '<tr><td>'+(i+1)+'</td><td><strong>'+u.full_name+'</strong></td>' +
'<td>'+u.email+'</td><td>'+u.phone+'</td><td>'+u.role+'</td>' +
'<td><span class="badge '+u.status+'">'+u.status+'</span></td><td>'+(u.country||"")+'</td></tr>').join('') +
'</tbody></table></body></html>';

const buildCSV = (users) => {
  const H = ["ID","Name","Email","Phone","Role","Status","Country","City","Address","Date of Birth","Postal Code"];
  const E = (v) => '"'+String(v ?? "").replace(/"/g, '""')+'"';
  const rows = users.map((u) => [u.id, u.full_name, u.email, u.phone, u.role, u.status, u.country,
    u.city, u.address, u.date_of_birth?.split("T")[0], u.postal_code].map(E).join(","));
  return [H.map(E).join(","), ...rows].join("\r\n");
};

const shareFile = async (path, mimeType, dialogTitle) => {
  let uri = path;
  if (Platform.OS === 'android') {
    try { const contentUri = await FileSystem.getContentUriAsync(path); uri = contentUri.uri; }
    catch { uri = path; }
  }
  await Sharing.shareAsync(uri, { mimeType, dialogTitle });
};

const exportCSV = async (users) => {
  const csv = buildCSV(users);
  if (Platform.OS === "web") {
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url; anchor.download = "users_"+Date.now()+".csv";
    document.body.appendChild(anchor); anchor.click(); anchor.remove();
    URL.revokeObjectURL(url); return;
  }
  const path = FileSystem.cacheDirectory + "users_" + Date.now() + ".csv";
  await FileSystem.writeAsStringAsync(path, csv, { encoding: FileSystem.EncodingType.UTF8 });
  await shareFile(path, "text/csv", "Export CSV");
};

const exportPDF = async (users) => {
  const html = buildHTML(users);
  if (Platform.OS === "web") {
    try {
      const { uri } = await Print.printToFileAsync({ html });
      if (uri) {
        const anchor = document.createElement("a"); anchor.href = uri;
        anchor.download = "users_"+Date.now()+".pdf";
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
    active:    { backgroundColor: '#16A34A', borderColor: '#16A34A' },
    inactive:  { backgroundColor: '#DC2626', borderColor: '#DC2626' },
    suspended: { backgroundColor: '#EAB308', borderColor: '#EAB308' },
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
  const s = STATUS_CFG[status] ?? STATUS_CFG.inactive;
  return (
    <View style={[styles.statusBadgeContainer, s.badge]}>
      <View style={[styles.statusDot, s.dot]} />
      <Text style={[styles.statusLabel, s.text]}>{s.label}</Text>
    </View>
  );
};
const UserCard = React.memo(({ item, index, onEdit, onDelete, onView }) => (
  <Animated.View entering={FadeInDown.delay(index * 40).springify()}>
    <View style={styles.userCard}>
      <View style={styles.userCardHeader}>
        <View style={styles.userCardLeft}>
          <View style={styles.userIconBox}>
            <MaterialCommunityIcons name="account" size={22} color="#1e3a8a" />
          </View>
          <View style={styles.userInfo}>
            <Text style={styles.userName} numberOfLines={1}>{item.full_name}</Text>
            <Text style={styles.userEmail}>{item.email}</Text>
          </View>
        </View>
        <StatusBadge status={item.status} />
      </View>

      <View style={styles.userDetails}>
        <View style={styles.userDetailItem}>
          <Ionicons name="call-outline" size={13} color="#94a3b8" />
          <Text style={styles.userDetailText}>{item.phone}</Text>
        </View>
        <View style={styles.userDetailItem}>
          <Ionicons name="shield-checkmark-outline" size={13} color="#94a3b8" />
          <Text style={styles.userDetailText}>{item.role}</Text>
        </View>
        {item.country && (
          <View style={styles.userDetailItem}>
            <Ionicons name="location-outline" size={13} color="#94a3b8" />
            <Text style={styles.userDetailText}>{item.country}</Text>
          </View>
        )}
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
        <TouchableOpacity onPress={() => onDelete(item.id, item.full_name)} style={styles.actionBtnDelete}>
          <Ionicons name="trash-outline" size={13} color="#ef4444" />
          <Text style={styles.actionBtnTextDelete}>Delete</Text>
        </TouchableOpacity>
      </View>
    </View>
  </Animated.View>
));

const ImagePickerField = ({ label, image, onChange }) => {
  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission required', 'We need camera roll access to select a profile photo.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true, aspect: [1, 1], quality: 0.8,
    });
    if (!result.canceled && result.assets?.length > 0) {
      const asset = result.assets[0];
      onChange({ uri: asset.uri, name: asset.fileName || "profile_"+Date.now()+".jpg", type: asset.mimeType || 'image/jpeg' });
    }
  };
  const removeImage = () => onChange(null);

  return (
    <View style={styles.imagePickerContainer}>
      <Text style={styles.imagePickerLabel}>{label}</Text>
      <View style={styles.imagePickerRow}>
        {image ? (
          <View style={styles.imageWrapper}>
            <Image source={{ uri: image.uri }} style={styles.imagePreview} />
            <TouchableOpacity onPress={removeImage} style={styles.imageRemoveBtn} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <Ionicons name="close-circle" size={16} color="white" />
            </TouchableOpacity>
          </View>
        ) : (
          <TouchableOpacity onPress={pickImage} style={styles.imagePlaceholder}>
            <Ionicons name="camera-outline" size={24} color="#94a3b8" />
          </TouchableOpacity>
        )}
        <View style={styles.imageActions}>
          <TouchableOpacity onPress={pickImage} style={styles.choosePhotoBtn}>
            <Text style={styles.choosePhotoText}>Choose Photo</Text>
          </TouchableOpacity>
          {image && <Text style={styles.removeHint}>Tap X to remove</Text>}
        </View>
      </View>
    </View>
  );
};
const UserForm = ({ visible, editingUser, form, setForm, saving, onSave, onClose }) => {
  const roleOptions = ROLES.map(r => ({ label: r.charAt(0).toUpperCase() + r.slice(1), value: r }));
  const statusOptions = STATUSES.map(s => ({ label: s.charAt(0).toUpperCase() + s.slice(1), value: s }));

  return (
    <Portal>
      <Modal visible={visible} onDismiss={onClose} contentContainerStyle={styles.modalContent}>
        <KeyboardAvoidingView style={styles.flex1} behavior={Platform.OS === "ios" ? "padding" : "height"}>
          <View style={styles.flex1}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalTitle}>{editingUser ? "Edit User" : "New User"}</Text>
                <Text style={styles.modalSubtitle}>{editingUser ? "Updating " + editingUser.full_name : "Create a user account"}</Text>
              </View>
              <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
                <Ionicons name="close" size={17} color="#64748b" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.flex1} contentContainerStyle={{ paddingBottom: 30, paddingHorizontal: 20 }} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
              <SectionLabel>Profile Photo</SectionLabel>
              <ImagePickerField label="Photo" image={form.profile_image} onChange={(img) => setForm({ ...form, profile_image: img })} />

              <SectionLabel>Account Information</SectionLabel>
              <Field label="Full Name *" value={form.full_name} onChangeText={(t) => setForm({ ...form, full_name: t })} />
              <Field label="Email *" value={form.email} onChangeText={(t) => setForm({ ...form, email: t })} keyboardType="email-address" />
              <Field label="Phone *" value={form.phone} onChangeText={(t) => setForm({ ...form, phone: t })} keyboardType="phone-pad" />
              <Field label={editingUser ? "Password (leave blank to keep unchanged)" : "Password *"}
                value={form.password} onChangeText={(t) => setForm({ ...form, password: t })} secureTextEntry />

              <SectionLabel>Role & Status</SectionLabel>
              <Dropdown label="Role" value={form.role} options={roleOptions} onSelect={(v) => setForm({ ...form, role: v })} />
              <PillRow options={STATUSES} value={form.status} onChange={(v) => setForm({ ...form, status: v })} />

              <SectionLabel>Personal Details</SectionLabel>
              <Field label="Date of Birth (YYYY-MM-DD)" value={form.date_of_birth} onChangeText={(t) => setForm({ ...form, date_of_birth: t })} />
              <Field label="Address" value={form.address} onChangeText={(t) => setForm({ ...form, address: t })} />
              <View style={styles.formRow}>
                <View style={styles.formRowItem}><Field label="City" value={form.city} onChangeText={(t) => setForm({ ...form, city: t })} /></View>
                <View style={styles.formRowItem}><Field label="State" value={form.state} onChangeText={(t) => setForm({ ...form, state: t })} /></View>
              </View>
              <View style={styles.formRow}>
                <View style={styles.formRowItem}><Field label="Country" value={form.country} onChangeText={(t) => setForm({ ...form, country: t })} /></View>
                <View style={styles.formRowItem}><Field label="Postal Code" value={form.postal_code} onChangeText={(t) => setForm({ ...form, postal_code: t })} /></View>
              </View>

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
            {user.profile_image && (<><SectionLabel>Profile Photo</SectionLabel><Image source={{ uri: user.profile_image }} style={styles.viewImage} /></>)}
            <SectionLabel>Account</SectionLabel>
            <View style={styles.viewField}><Text style={styles.viewFieldValue}>{user.full_name}</Text></View>
            <View style={styles.viewField}><Text style={styles.viewFieldValue}>{user.email}</Text></View>
            <View style={styles.viewField}><Text style={styles.viewFieldValue}>{user.phone}</Text></View>
            <View style={styles.viewField}><Text style={styles.viewFieldValue}>Role: {user.role}</Text></View>
            <View style={styles.viewField}><Text style={styles.viewFieldValue}>Status: {user.status}</Text></View>
            {user.date_of_birth && (<><SectionLabel>Date of Birth</SectionLabel><View style={styles.viewField}><Text style={styles.viewFieldValue}>{user.date_of_birth.split("T")[0]}</Text></View></>)}
            <SectionLabel>Location</SectionLabel>
            <View style={styles.viewField}><Text style={styles.viewFieldValue}>{user.address || "—"}</Text></View>
            <View style={styles.viewField}><Text style={styles.viewFieldValue}>{user.city && user.state ? user.city + ", " + user.state : "—"}</Text></View>
            <View style={styles.viewField}><Text style={styles.viewFieldValue}>{user.country || "—"}</Text></View>
            <View style={styles.viewField}><Text style={styles.viewFieldValue}>{user.postal_code || "—"}</Text></View>
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
  const { users, loading: loadingStates, refreshing: refreshingStates,
    getPagination, updatePagination, getSearchQuery, updateSearchQuery, fetchUsers } = useAdminData();

  const loading = loadingStates.users;
  const refreshing = refreshingStates.users;
  const { page, limit, total: totalItems } = getPagination("users");
  const searchQuery = getSearchQuery("users");

  const [searchInput, setSearchInput] = useState(searchQuery);
  const [modalVisible, setModalVisible] = useState(false);
  const [exportModalVisible, setExportModalVisible] = useState(false);
  const [viewModalVisible, setViewModalVisible] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [viewingUser, setViewingUser] = useState(null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [form, setForm] = useState({ ...EMPTY_FORM });
  const debounceRef = useRef(null);

  useEffect(() => { fetchUsers(); }, [page, limit, searchQuery]);

  const commitSearch = useCallback((text) => updateSearchQuery("users", text), [updateSearchQuery]);

  const handleSearch = (text) => {
    setSearchInput(text);
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => commitSearch(text), 500);
  };
  const openCreate = () => { setEditingUser(null); setForm({ ...EMPTY_FORM }); setModalVisible(true); };
  const openEdit = (item) => { setEditingUser(item); setForm(itemToForm(item)); setModalVisible(true); };
  const openView = (item) => { setViewingUser(item); setViewModalVisible(true); };

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
      if (form.profile_image && form.profile_image.uri && !form.profile_image.uri.startsWith('http')) {
        const fd = new FormData();
        Object.keys(payload).forEach(key => fd.append(key, payload[key]));
        fd.append('profile_image', { uri: form.profile_image.uri, name: form.profile_image.name || 'profile.jpg', type: form.profile_image.type || 'image/jpeg' });
        finalData = fd;
      }
      if (editingUser) { await updateUser(editingUser.id, finalData); }
      else { await createUser(finalData); }
      setModalVisible(false);
      fetchUsers(true);
    } catch (e) {
      const msg = e?.response?.data?.message || e.message || "Could not save user.";
      Alert.alert("Error", msg);
    } finally { setSaving(false); }
  };

  const handleDelete = (id, name) => {
    Alert.alert("Remove User", 'Delete user "' + name + '"?', [
      { text: "Cancel", style: "cancel" },
      { text: "Delete", style: "destructive", onPress: async () => {
        setDeleting(true);
        try { await deleteUser(id); fetchUsers(true); }
        catch (e) { Alert.alert("Error", "Could not delete user."); }
        finally { setDeleting(false); }
      }},
    ]);
  };

  const handleExport = async (type) => {
    setExportModalVisible(false);
    setExporting(true);
    try {
      if (type === "csv") await exportCSV(users);
      if (type === "pdf") await exportPDF(users);
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
            <Text style={styles.headerTitle}>User Manager</Text>
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
        <Searchbar placeholder="Search by name, email, phone..." onChangeText={handleSearch}
          value={searchInput} elevation={0} style={styles.searchbar} inputStyle={styles.searchbarInput}
          placeholderTextColor="rgba(255,255,255,0.4)" iconColor="rgba(255,255,255,0.6)" />
      </View>

      {loading && !refreshing ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator color="#1e3a8a" size="large" />
          <Text style={styles.loadingText}>Loading users...</Text>
        </View>
      ) : (
        <FlatList style={styles.flex1} data={users}
          keyExtractor={(item) => item.id?.toString()}
          renderItem={({ item, index }) => (<UserCard item={item} index={index} onEdit={openEdit} onDelete={handleDelete} onView={openView} />)}
          contentContainerStyle={{ flexGrow: 1, paddingTop: 14, paddingBottom: 24 }}
          showsVerticalScrollIndicator={false} nestedScrollEnabled={true} keyboardShouldPersistTaps="handled"
          ListHeaderComponent={
            <View style={styles.statsBar}>
              {[{ label: "Total", val: totalItems },
                { label: "Active", val: users.filter(u => u.status === "active").length },
                { label: "Inactive", val: users.filter(u => u.status === "inactive").length },
                { label: "Suspended", val: users.filter(u => u.status === "suspended").length },
              ].map(({ label, val }, i, arr) => (
                <View key={label} style={[styles.statBox, i < arr.length - 1 && styles.statBoxBorder]}>
                  <Text style={styles.statValue}>{val}</Text>
                  <Text style={styles.statLabel}>{label}</Text>
                </View>
              ))}
            </View>
          }
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => fetchUsers(true)} tintColor="#1e3a8a" colors={["#1e3a8a"]} />}
          ListEmptyComponent={() => (
            <View style={styles.emptyContainer}>
              <MaterialCommunityIcons name="account-remove-outline" size={72} color="#e2e8f0" />
              <Text style={styles.emptyText}>{searchQuery ? 'No results for "' + searchQuery + '"' : "No users found"}</Text>
              {!searchQuery && (
                <TouchableOpacity onPress={openCreate} style={styles.emptyAddBtn}>
                  <Ionicons name="add" size={16} color="#fff" />
                  <Text style={styles.emptyAddBtnText}>Add First User</Text>
                </TouchableOpacity>
              )}
            </View>
          )}
          ListFooterComponent={() => users.length > 0 ? (
            <View style={styles.footerContainer}>
              <View style={styles.footer}>
                <Text style={styles.footerText}>Page {page} / {totalPages} {users.length} of {totalItems}</Text>
                <View style={styles.pagination}>
                  <TouchableOpacity disabled={page <= 1}
                    onPress={() => updatePagination("users", { page: page - 1 })}
                    style={[styles.paginationBtn, page <= 1 ? styles.paginationBtnDisabled : styles.paginationBtnActive]}>
                    <Text style={[styles.paginationText, page <= 1 ? styles.paginationTextDisabled : styles.paginationTextActive]}>Prev</Text>
                  </TouchableOpacity>
                  <TouchableOpacity disabled={page >= totalPages}
                    onPress={() => updatePagination("users", { page: page + 1 })}
                    style={[styles.paginationBtn, page >= totalPages ? styles.paginationBtnDisabled : styles.paginationBtnActive]}>
                    <Text style={[styles.paginationText, page >= totalPages ? styles.paginationTextDisabled : styles.paginationTextActive]}>Next</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          ) : null}
        />
      )}

      <UserForm visible={modalVisible} editingUser={editingUser} form={form}
        setForm={setForm} saving={saving} onSave={handleSave} onClose={() => setModalVisible(false)} />

      <ViewUserModal visible={viewModalVisible} user={viewingUser} onClose={() => setViewModalVisible(false)} />

      <Portal>
        <Modal visible={exportModalVisible} onDismiss={() => setExportModalVisible(false)}
          contentContainerStyle={styles.exportModal}>
          <Text style={styles.exportModalTitle}>Export User Data</Text>
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
  userCard: { backgroundColor: '#FFFFFF', marginHorizontal: 12, marginBottom: 12, borderRadius: 16, padding: 16, borderWidth: 1, borderColor: '#F1F5F9', shadowColor: '#1e3a8a', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 2 },
  userCardHeader: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 12 },
  userCardLeft: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 },
  userIconBox: { backgroundColor: '#EFF6FF', padding: 10, borderRadius: 14 },
  userInfo: { flex: 1 },
  userName: { fontSize: 14, fontWeight: '900', color: '#0F172A' },
  userEmail: { fontSize: 10, fontWeight: '700', color: '#64748B' },
  userDetails: { flexDirection: 'row', gap: 12, paddingTop: 12, marginBottom: 12, borderTopWidth: 1, borderTopColor: '#F8FAFC' },
  userDetailItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  userDetailText: { fontSize: 10, fontWeight: '700', color: '#475569' },
  cardActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 8 },
  actionBtnView: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#EFF6FF', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 14 },
  actionBtnTextView: { fontSize: 10, fontWeight: '800', color: '#1D4ED8' },
  actionBtnEdit: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#F1F5F9', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 14 },
  actionBtnTextEdit: { fontSize: 10, fontWeight: '800', color: '#475569' },
  actionBtnDelete: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#FEF2F2', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 14 },
  actionBtnTextDelete: { fontSize: 10, fontWeight: '800', color: '#EF4444' },
  imagePickerContainer: { marginBottom: 12 },
  imagePickerLabel: { fontSize: 10, fontWeight: '700', color: '#64748B', marginBottom: 8 },
  imagePickerRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  imageWrapper: { position: 'relative' },
  imagePreview: { width: 80, height: 80, borderRadius: 14 },
  imageRemoveBtn: { position: 'absolute', top: -8, right: -8, backgroundColor: '#EF4444', borderRadius: 9999, padding: 4 },
  imagePlaceholder: { width: 80, height: 80, backgroundColor: '#F1F5F9', borderRadius: 14, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderStyle: 'dashed', borderColor: '#CBD5E1' },
  imageActions: { flex: 1 },
  choosePhotoBtn: { backgroundColor: '#F1F5F9', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 14 },
  choosePhotoText: { fontSize: 10, fontWeight: '700', color: '#1D4ED8' },
  removeHint: { fontSize: 10, color: '#94A3B8', marginTop: 4 },
  modalContent: { backgroundColor: '#fff', margin: 14, borderRadius: 24, maxHeight: '92%' },
  modalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 20, paddingBottom: 16, borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
  modalTitle: { fontSize: 16, fontWeight: '900', color: '#0F172A' },
  modalSubtitle: { fontSize: 10, color: '#94A3B8', marginTop: 2 },
  closeBtn: { width: 36, height: 36, backgroundColor: '#F1F5F9', borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  formRow: { flexDirection: 'row', gap: 8 },
  formRowItem: { flex: 1 },
  formActions: { flexDirection: 'row', gap: 12, marginTop: 16, marginBottom: 40 },
  cancelBtn: { flex: 1, paddingVertical: 16, borderRadius: 16, alignItems: 'center', backgroundColor: '#F1F5F9', borderWidth: 1, borderColor: '#E2E8F0' },
  cancelBtnText: { fontWeight: '800', color: '#64748B', fontSize: 12 },
  saveBtn: { flex: 2, paddingVertical: 16, borderRadius: 16, alignItems: 'center', backgroundColor: '#1E3A8A', shadowColor: '#1e3a8a', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 5 },
  saveBtnText: { fontWeight: '900', color: '#FFFFFF', fontSize: 12 },
  viewImage: { width: 96, height: 96, borderRadius: 14, marginBottom: 12 },
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
