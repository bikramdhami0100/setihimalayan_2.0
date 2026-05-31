import React, { useContext, useEffect, useState } from "react";
import { View, ScrollView, StyleSheet, Dimensions, Modal, TextInput, Alert, TouchableOpacity, Platform, StatusBar } from "react-native";
import { Text, ActivityIndicator } from "react-native-paper";
import { Feather, Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { Image } from "expo-image";
import Animated, { FadeInUp } from "react-native-reanimated";
import { AuthContext } from "../../../context/AuthContext";
import * as authApi from "../../../api/auth";
import * as ImagePicker from "expo-image-picker";
import { API_URL } from "../../../utils/constants";

const { width } = Dimensions.get("window");

export default function ProfileScreen() {
  const { user: contextUser, logout, updateProfile: contextUpdateProfile, updateLocalUser } = useContext(AuthContext);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState(null);
  const [editModal, setEditModal] = useState(false);
  const [imgError, setImgError] = useState(false);
  const [form, setForm] = useState({});

  useEffect(() => { fetchProfile(); }, []);

  const fetchProfile = async () => {
    setLoading(true);
    try {
      const res = await authApi.getProfile();
      const userData = res.data.data.user;
      setProfile(userData);
      setForm({
        full_name: userData.full_name || "",
        phone: userData.phone || "",
        date_of_birth: userData.date_of_birth ? userData.date_of_birth.split("T")[0] : "",
        address: userData.address || "",
        city: userData.city || "",
        state: userData.state || "",
        country: userData.country || "Nepal",
        postal_code: userData.postal_code || "",
      });
    } catch (e) {
      setError(e.response?.data?.message || "Failed to load profile");
    } finally {
      setLoading(false);
    }
  };

  const displayName = profile?.full_name || contextUser?.name || "User";
  const displayEmail = profile?.email || contextUser?.email || "";
  const initial = displayName.charAt(0).toUpperCase();

  const getImageUrl = (url) => {
    if (!url) return null;
    if (url.startsWith("http")) return url;
    const baseUrl = API_URL.replace("/api", "");
    return `${baseUrl}${url}`;
  };

  const handleLogout = () => { logout(); router.replace("/(auth)/login"); };

  const pickFileWeb = () => {
    return new Promise((resolve, reject) => {
      const input = document.createElement("input");
      input.type = "file";
      input.accept = "image/*";
      input.onchange = (e) => { const file = e.target.files?.[0]; if (file) resolve(file); else reject(new Error("No file selected")); };
      input.onerror = () => reject(new Error("File picker error"));
      input.click();
    });
  };

  const handlePickImage = async () => {
    try {
      if (Platform.OS === "web") { const file = await pickFileWeb(); handleUploadImage(file); return; }
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== "granted") { Alert.alert("Permission required", "We need camera roll access to select a profile photo."); return; }
      const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ["images"], allowsEditing: true, aspect: [1, 1], quality: 0.8 });
      if (!result.canceled && result.assets?.length > 0) handleUploadImage(result.assets[0]);
    } catch (e) { Alert.alert("Error", "Could not open image picker."); }
  };

  const handleTakePhoto = async () => {
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== "granted") { Alert.alert("Permission required", "We need camera access to take a photo."); return; }
      const result = await ImagePicker.launchCameraAsync({ allowsEditing: true, aspect: [1, 1], quality: 0.8 });
      if (!result.canceled && result.assets?.length > 0) handleUploadImage(result.assets[0]);
    } catch (e) { Alert.alert("Error", "Could not open camera."); }
  };

  const handleUploadImage = async (fileOrAsset) => {
    setUploading(true);
    try {
      const formData = new FormData();
      if (Platform.OS === "web") {
        formData.append("profile_image", fileOrAsset, fileOrAsset.name || `profile_${Date.now()}.jpg`);
      } else {
        formData.append("profile_image", { uri: fileOrAsset.uri, name: fileOrAsset.fileName || `profile_${Date.now()}.jpg`, type: fileOrAsset.mimeType || "image/jpeg" });
      }
      const res = await authApi.uploadProfileImage(formData);
      if (res.data.success) {
        const profileRes = await authApi.getProfile();
        const userData = profileRes.data.data.user;
        setProfile(userData);
        setImgError(false);
        updateLocalUser(userData);
        Alert.alert("Success", "Profile photo updated!");
      }
    } catch (e) {
      Alert.alert("Error", e.response?.data?.message || "Failed to upload image");
    } finally {
      setUploading(false);
    }
  };

  const handleImagePress = () => {
    if (Platform.OS === "web") { handlePickImage(); return; }
    Alert.alert("Change Profile Photo", "Choose an option", [
      { text: "Choose from Gallery", onPress: handlePickImage },
      { text: "Take Photo", onPress: handleTakePhoto },
      { text: "Cancel", style: "cancel" },
    ]);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await contextUpdateProfile(form);
      if (res.success) { setEditModal(false); fetchProfile(); }
      else { Alert.alert("Error", res.message || "Failed to update profile"); }
    } catch (e) {
      Alert.alert("Error", e.response?.data?.message || "Failed to update profile");
    } finally {
      setSaving(false);
    }
  };

  const InfoRow = ({ label, value, icon }) => (
    <View style={styles.infoRow}>
      <View style={[styles.infoIconBox, { backgroundColor: "#eff6ff" }]}>
        <Feather name={icon} size={16} color="#1e3a8a" />
      </View>
      <View style={styles.infoContent}>
        <Text style={styles.infoLabel}>{label}</Text>
        <Text style={styles.infoValue}>{value || "—"}</Text>
      </View>
    </View>
  );

  const MenuItem = ({ icon, label, onPress, color = "#1e3a8a" }) => (
    <TouchableOpacity onPress={onPress} activeOpacity={0.6} style={styles.menuItem}>
      <View style={[styles.menuIconBox, { backgroundColor: color + "10" }]}>
        <Feather name={icon} size={18} color={color} />
      </View>
      <Text style={[styles.menuItemLabel, { color }]}>{label}</Text>
      <Feather name="chevron-right" size={16} color="#cbd5e1" />
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <View style={[styles.container, styles.center]}>
        <ActivityIndicator size="large" color="#1e3a8a" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#1e3a8a" />
      <View style={styles.topCircle} />
      <Text>{profile?.profile_image}</Text>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        <Animated.View entering={FadeInUp.duration(800).delay(100)} style={styles.profileCard}>
          <View style={styles.profileTop}>
            <TouchableOpacity onPress={handleImagePress} disabled={uploading} style={styles.avatarWrap}>
              {uploading ? (
                <View style={[styles.avatar, styles.avatarUploading]}>
                  <ActivityIndicator size="large" color="#fff" />
                </View>
              ) : profile?.profile_image && !imgError ? (
                <Image source={getImageUrl(profile.profile_image)} style={styles.avatarImage} contentFit="cover" onError={() => setImgError(true)} />
              ) : (
                <View style={styles.avatar}>
                  <Text style={styles.avatarLetter}>{initial}</Text>
                </View>
              )}
              <View style={styles.cameraBadge}>
                <Feather name="camera" size={12} color="#fff" />
              </View>
            </TouchableOpacity>
            <Text style={styles.name}>{displayName}</Text>
            <Text style={styles.email}>{displayEmail}</Text>
            {profile?.role && (
              <View style={[styles.roleBadge, profile.role === "passenger" ? styles.roleBadgePassenger : styles.roleBadgeAdmin]}>
                <Feather name={profile.role === "passenger" ? "user" : "shield"} size={10} color={profile.role === "passenger" ? "#1d4ed8" : "#d97706"} />
                <Text style={[styles.roleBadgeText, { color: profile.role === "passenger" ? "#1d4ed8" : "#d97706" }]}>
                  {profile.role.replace("_", " ").toUpperCase()}
                </Text>
              </View>
            )}
            <TouchableOpacity onPress={() => setEditModal(true)} activeOpacity={0.85} style={styles.editBtn}>
              <Feather name="edit-2" size={14} color="#fff" />
              <Text style={styles.editBtnText}>Edit Profile</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.statsRow}>
            {[
              { value: "12", label: "Trips", icon: "map" },
              { value: "2.4k", label: "KM", icon: "target" },
              { value: "4", label: "Coupons", icon: "gift" },
            ].map((stat, i) => (
              <View key={i} style={styles.statItem}>
                <Text style={styles.statValue}>{stat.value}</Text>
                <Text style={styles.statLabel}>{stat.label}</Text>
              </View>
            ))}
          </View>
        </Animated.View>

        <Animated.View entering={FadeInUp.duration(800).delay(200)}>
          <View style={styles.sectionHead}>
            <View style={[styles.sectionBar, { backgroundColor: "#1e3a8a" }]} />
            <Text style={styles.sectionTitle}>Personal Information</Text>
          </View>
          <View style={styles.card}>
            <InfoRow label="Phone" value={profile?.phone} icon="phone" />
            <View style={styles.divider} />
            <InfoRow label="Date of Birth" value={profile?.date_of_birth ? new Date(profile.date_of_birth).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" }) : null} icon="calendar" />
          </View>
        </Animated.View>

        <Animated.View entering={FadeInUp.duration(800).delay(300)}>
          <View style={styles.sectionHead}>
            <View style={[styles.sectionBar, { backgroundColor: "#059669" }]} />
            <Text style={styles.sectionTitle}>Address</Text>
          </View>
          <View style={styles.card}>
            <InfoRow label="Address" value={profile?.address} icon="map-pin" />
            <View style={styles.divider} />
            <InfoRow label="City" value={profile?.city} icon="home" />
            <View style={styles.divider} />
            <InfoRow label="State" value={profile?.state} icon="map" />
            <View style={styles.divider} />
            <InfoRow label="Country" value={profile?.country} icon="globe" />
            <View style={styles.divider} />
            <InfoRow label="Postal Code" value={profile?.postal_code} icon="hash" />
          </View>
        </Animated.View>

        <Animated.View entering={FadeInUp.duration(800).delay(400)}>
          <View style={styles.sectionHead}>
            <View style={[styles.sectionBar, { backgroundColor: "#d97706" }]} />
            <Text style={styles.sectionTitle}>Account</Text>
          </View>
          <View style={styles.card}>
            <InfoRow label="Member Since" value={profile?.created_at ? new Date(profile.created_at).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" }) : null} icon="clock" />
            <View style={styles.divider} />
            <InfoRow label="Status" value={profile?.status ? profile.status.charAt(0).toUpperCase() + profile.status.slice(1) : null} icon="shield" />
            <View style={styles.divider} />
            <InfoRow label="Email Verified" value={profile?.is_email_verified ? "Yes" : "No"} icon="check-circle" />
          </View>
        </Animated.View>

        <Animated.View entering={FadeInUp.duration(800).delay(500)}>
          <View style={styles.sectionHead}>
            <View style={[styles.sectionBar, { backgroundColor: "#1e3a8a" }]} />
            <Text style={styles.sectionTitle}>My Journey</Text>
          </View>
          <View style={styles.card}>
            <MenuItem icon="ticket" label="My Bookings" onPress={() => router.push("/(customer)/(tabs)/my-bookings")} />
            <View style={styles.divider} />
            <MenuItem icon="users" label="Saved Passengers" color="#059669" />
            <View style={styles.divider} />
            <MenuItem icon="rotate-ccw" label="Refunds & Cancellations" color="#d97706" />
          </View>
        </Animated.View>

        <Animated.View entering={FadeInUp.duration(800).delay(600)}>
          <View style={styles.sectionHead}>
            <View style={[styles.sectionBar, { backgroundColor: "#0891b2" }]} />
            <Text style={styles.sectionTitle}>Payments & Offers</Text>
          </View>
          <View style={styles.card}>
            <MenuItem icon="credit-card" label="Payment Methods" color="#0891b2" />
            <View style={styles.divider} />
            <MenuItem icon="shield" label="Privacy Policy" onPress={() => router.push("/(customer)/privacy-policy")} color="#0891b2" />
          </View>
        </Animated.View>

        <Animated.View entering={FadeInUp.duration(800).delay(700)}>
          <View style={styles.sectionHead}>
            <View style={[styles.sectionBar, { backgroundColor: "#64748b" }]} />
            <Text style={styles.sectionTitle}>Preferences</Text>
          </View>
          <View style={styles.card}>
            <MenuItem icon="bell" label="Notifications" />
            <View style={styles.divider} />
            <MenuItem icon="globe" label="Language" color="#059669" />
            <View style={styles.divider} />
            <MenuItem icon="help-circle" label="Help & Support" color="#d97706" />
          </View>
        </Animated.View>

        <Animated.View entering={FadeInUp.duration(800).delay(800)}>
          <TouchableOpacity onPress={handleLogout} activeOpacity={0.85} style={styles.logoutBtn}>
            <Feather name="log-out" size={16} color="#dc2626" />
            <Text style={styles.logoutText}>Sign Out</Text>
          </TouchableOpacity>
        </Animated.View>

        <Animated.View entering={FadeInUp.duration(800).delay(900)} style={styles.securityBadge}>
          <Feather name="shield" size={12} color="#1e40af" />
          <Text style={styles.securityText}>SECURE & ENCRYPTED</Text>
        </Animated.View>

        <Text style={styles.version}>Seti Himalayan v1.2.4</Text>
        <View style={{ height: 80 }} />
      </ScrollView>

      <Modal visible={editModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                <View style={{ width: 36, height: 36, borderRadius: 10, backgroundColor: "#eff6ff", alignItems: "center", justifyContent: "center" }}>
                  <Feather name="edit-2" size={16} color="#1e3a8a" />
                </View>
                <Text style={styles.modalTitle}>Edit Profile</Text>
              </View>
              <TouchableOpacity onPress={() => setEditModal(false)} style={{ width: 36, height: 36, borderRadius: 10, backgroundColor: "#f1f5f9", alignItems: "center", justifyContent: "center" }}>
                <Feather name="x" size={18} color="#64748b" />
              </TouchableOpacity>
            </View>
            <ScrollView showsVerticalScrollIndicator={false}>
              <Field label="Full Name" value={form.full_name} onChange={(v) => setForm({ ...form, full_name: v })} placeholder="Full Name" />
              <Field label="Phone" value={form.phone} onChange={(v) => setForm({ ...form, phone: v })} placeholder="Phone" keyboardType="phone-pad" />
              <Field label="Date of Birth" value={form.date_of_birth} onChange={(v) => setForm({ ...form, date_of_birth: v })} placeholder="YYYY-MM-DD" />
              <Field label="Address" value={form.address} onChange={(v) => setForm({ ...form, address: v })} placeholder="Address" multiline />
              <Field label="City" value={form.city} onChange={(v) => setForm({ ...form, city: v })} placeholder="City" />
              <Field label="State" value={form.state} onChange={(v) => setForm({ ...form, state: v })} placeholder="State" />
              <Field label="Country" value={form.country} onChange={(v) => setForm({ ...form, country: v })} placeholder="Country" />
              <Field label="Postal Code" value={form.postal_code} onChange={(v) => setForm({ ...form, postal_code: v })} placeholder="Postal Code" />
              <TouchableOpacity onPress={handleSave} disabled={saving} activeOpacity={0.85} style={styles.saveBtn}>
                {saving ? <ActivityIndicator size="small" color="#fff" /> : <Text style={styles.saveBtnText}>Save Changes</Text>}
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const Field = ({ label, value, onChange, placeholder, keyboardType, multiline }) => (
  <View style={{ marginBottom: 16 }}>
    <Text style={styles.fieldLabel}>{label}</Text>
    <TextInput
      style={[styles.fieldInput, multiline && { minHeight: 80, textAlignVertical: "top" }]}
      value={value} onChangeText={onChange} placeholder={placeholder}
      keyboardType={keyboardType} multiline={multiline}
      placeholderTextColor="#94a3b8"
    />
  </View>
);

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f8fafc" },
  center: { justifyContent: "center", alignItems: "center" },
  topCircle: {
    position: "absolute", top: -width * 0.4, right: -width * 0.2,
    width: width * 1.2, height: width * 1.2, borderRadius: width * 0.6,
    backgroundColor: "#e0f2fe", zIndex: -1,
  },
  scrollContent: { paddingHorizontal: 24, paddingTop: 24 },

  profileCard: {
    backgroundColor: "#fff", borderRadius: 32, padding: 24, paddingBottom: 0,
    shadowColor: "#1e3a8a", shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.1, shadowRadius: 24, elevation: 6,
    marginBottom: 24, overflow: "hidden",
  },
  profileTop: { alignItems: "center" },
  avatarWrap: { position: "relative", marginBottom: 14 },
  avatar: {
    width: 88, height: 88, borderRadius: 44,
    backgroundColor: "#1e3a8a", alignItems: "center", justifyContent: "center",
    elevation: 8, shadowColor: "#1e3a8a", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8,
  },
  avatarUploading: {
    width: 88, height: 88, borderRadius: 44, justifyContent: "center", alignItems: "center", backgroundColor: "#1e3a8a",
  },
  avatarImage: {
    width: 88, height: 88, borderRadius: 44,
    elevation: 8, shadowColor: "#1e3a8a", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8,
  },
  avatarLetter: { color: "#fff", fontSize: 36, fontWeight: "900" },
  cameraBadge: {
    position: "absolute", bottom: 2, right: 2,
    backgroundColor: "#1e3a8a", borderRadius: 12, width: 24, height: 24,
    justifyContent: "center", alignItems: "center",
    borderWidth: 2, borderColor: "#fff", elevation: 4,
  },
  name: { fontWeight: "900", color: "#0f172a", fontSize: 22, marginTop: 4 },
  email: { color: "#64748b", fontSize: 13, fontWeight: "500", marginBottom: 10 },
  roleBadge: {
    flexDirection: "row", alignItems: "center", gap: 6,
    paddingHorizontal: 14, paddingVertical: 6, borderRadius: 20, marginBottom: 16,
  },
  roleBadgePassenger: { backgroundColor: "#dbeafe" },
  roleBadgeAdmin: { backgroundColor: "#fef3c7" },
  roleBadgeText: { fontSize: 10, fontWeight: "800", letterSpacing: 0.5 },
  editBtn: {
    flexDirection: "row", alignItems: "center", gap: 6,
    backgroundColor: "#1e3a8a", borderRadius: 14, paddingHorizontal: 20, paddingVertical: 10,
    elevation: 4, shadowColor: "#1e3a8a", shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.2, shadowRadius: 6,
  },
  editBtnText: { color: "#fff", fontSize: 13, fontWeight: "700" },
  statsRow: {
    flexDirection: "row", justifyContent: "space-around", alignItems: "center",
    marginTop: 24, paddingVertical: 16, borderTopWidth: 1, borderTopColor: "#f1f5f9",
  },
  statItem: { alignItems: "center", flex: 1 },
  statValue: { fontWeight: "800", color: "#1e3a8a", fontSize: 20 },
  statLabel: { color: "#94a3b8", fontWeight: "700", textTransform: "uppercase", fontSize: 9, marginTop: 2 },

  sectionHead: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 12, marginLeft: 4 },
  sectionBar: { width: 4, height: 16, borderRadius: 2 },
  sectionTitle: { fontSize: 13, fontWeight: "800", color: "#0f172a", letterSpacing: 0.5 },

  card: {
    backgroundColor: "#fff", borderRadius: 24, overflow: "hidden", marginBottom: 20,
    shadowColor: "#000", shadowOpacity: 0.04, shadowRadius: 10, elevation: 2,
    borderWidth: 1, borderColor: "#f1f5f9",
  },

  infoRow: {
    flexDirection: "row", alignItems: "center", paddingVertical: 14, paddingHorizontal: 16, gap: 14,
  },
  infoIconBox: {
    width: 36, height: 36, borderRadius: 10, alignItems: "center", justifyContent: "center",
  },
  infoContent: { flex: 1 },
  infoLabel: { fontSize: 11, color: "#94a3b8", fontWeight: "600", textTransform: "uppercase", letterSpacing: 0.5 },
  infoValue: { fontSize: 15, color: "#0f172a", fontWeight: "600", marginTop: 2 },
  divider: { height: 1, backgroundColor: "#f8fafc", marginHorizontal: 16 },

  menuItem: {
    flexDirection: "row", alignItems: "center", paddingVertical: 14, paddingHorizontal: 16, gap: 14,
  },
  menuIconBox: {
    width: 36, height: 36, borderRadius: 10, alignItems: "center", justifyContent: "center",
  },
  menuItemLabel: { flex: 1, fontSize: 15, fontWeight: "600" },

  logoutBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8,
    backgroundColor: "#fef2f2", borderRadius: 16, paddingVertical: 14,
    borderWidth: 1, borderColor: "#fee2e2", marginTop: 8,
  },
  logoutText: { color: "#dc2626", fontSize: 15, fontWeight: "800" },

  securityBadge: {
    flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6,
    marginTop: 28, backgroundColor: "#eff6ff", alignSelf: "center",
    paddingHorizontal: 20, paddingVertical: 10, borderRadius: 100,
    borderWidth: 1, borderColor: "#dbeafe",
  },
  securityText: { fontSize: 9, fontWeight: "900", color: "#1e40af", letterSpacing: 1 },

  version: { textAlign: "center", color: "#cbd5e1", marginTop: 20, fontWeight: "600", fontSize: 12 },

  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "flex-end" },
  modalContent: {
    backgroundColor: "#fff", borderTopLeftRadius: 32, borderTopRightRadius: 32,
    maxHeight: "85%", padding: 24, paddingBottom: 40,
  },
  modalHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 24 },
  modalTitle: { fontSize: 18, fontWeight: "900", color: "#0f172a" },
  fieldLabel: {
    fontSize: 11, fontWeight: "700", color: "#64748b", marginBottom: 6,
    textTransform: "uppercase", letterSpacing: 0.5,
  },
  fieldInput: {
    backgroundColor: "#f8fafc", borderRadius: 14, paddingHorizontal: 16, paddingVertical: 12,
    fontSize: 15, color: "#0f172a", borderWidth: 1.5, borderColor: "#e2e8f0",
  },
  saveBtn: {
    backgroundColor: "#1e3a8a", borderRadius: 16, paddingVertical: 15, alignItems: "center",
    marginTop: 8, elevation: 6, shadowColor: "#1e3a8a", shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.2, shadowRadius: 6,
  },
  saveBtnText: { color: "#fff", fontSize: 15, fontWeight: "900", letterSpacing: 0.5 },
});
