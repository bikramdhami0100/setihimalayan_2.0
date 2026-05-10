import React, { useContext, useEffect, useState } from "react";
import { View, SafeAreaView, ScrollView, StyleSheet, Alert, Platform } from "react-native";
import { Text, Surface, Divider, Button, ActivityIndicator, Snackbar, Switch, Modal, TextInput } from "react-native-paper";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { AuthContext } from "../../context/AuthContext";
import * as authApi from "../../api/auth";

export default function SettingsScreen() {
  const { user, changePassword } = useContext(AuthContext);
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);

  const [pwModal, setPwModal] = useState(false);
  const [pwForm, setPwForm] = useState({ currentPassword: "", newPassword: "", confirmPassword: "" });
  const [changingPw, setChangingPw] = useState(false);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    setLoading(true);
    try {
      const res = await authApi.getSettings();
      setSettings(res.data.data);
    } catch (e) {
      setError(e.response?.data?.message || "Failed to load settings");
    } finally {
      setLoading(false);
    }
  };

  const handleToggle = async (key, value) => {
    const updated = {
      ...settings,
      notification_preferences: {
        ...settings.notification_preferences,
        [key]: value,
      },
    };
    setSettings(updated);
    setSaving(true);
    try {
      await authApi.updateSettings({
        notification_preferences: updated.notification_preferences,
      });
    } catch (e) {
      setError("Failed to update setting");
      fetchSettings();
    } finally {
      setSaving(false);
    }
  };

  const handleLanguageChange = async (lang) => {
    const updated = { ...settings, language: lang };
    setSettings(updated);
    setSaving(true);
    try {
      await authApi.updateSettings({ language: lang });
      setSuccessMsg(`Language changed to ${lang === "en" ? "English" : "Nepali"}`);
    } catch (e) {
      setError("Failed to update language");
      fetchSettings();
    } finally {
      setSaving(false);
    }
  };

  const handleChangePassword = async () => {
    if (!pwForm.currentPassword || !pwForm.newPassword || !pwForm.confirmPassword) {
      Alert.alert("Error", "Please fill in all fields");
      return;
    }
    if (pwForm.newPassword !== pwForm.confirmPassword) {
      Alert.alert("Error", "New passwords do not match");
      return;
    }
    if (pwForm.newPassword.length < 6) {
      Alert.alert("Error", "Password must be at least 6 characters");
      return;
    }

    setChangingPw(true);
    try {
      const res = await changePassword({
        currentPassword: pwForm.currentPassword,
        newPassword: pwForm.newPassword,
        email: user?.email,
      });
      if (res.success) {
        setPwModal(false);
        setPwForm({ currentPassword: "", newPassword: "", confirmPassword: "" });
        setSuccessMsg("Password changed successfully");
      } else {
        Alert.alert("Error", res.message || "Failed to change password");
      }
    } catch (e) {
      Alert.alert("Error", "Failed to change password");
    } finally {
      setChangingPw(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#1e3a8a" />
        </View>
      </SafeAreaView>
    );
  }

  const prefs = settings?.notification_preferences || {};

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>SECURITY</Text>
          <Surface style={styles.card} elevation={1}>
            <View style={styles.row}>
              <View style={styles.rowIcon}>
                <Ionicons name="lock-closed-outline" size={20} color="#64748b" />
              </View>
              <View style={styles.rowContent}>
                <Text style={styles.rowLabel}>Password</Text>
                <Text style={styles.rowValue}>Change your account password</Text>
              </View>
              <Button
                mode="text"
                onPress={() => setPwModal(true)}
                textColor="#1e3a8a"
                compact
              >
                Change
              </Button>
            </View>
          </Surface>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>NOTIFICATIONS</Text>
          <Surface style={styles.card} elevation={1}>
            <SettingToggle
              icon="notifications-outline"
              label="Push Notifications"
              value={prefs.push_notifications}
              onToggle={(v) => handleToggle("push_notifications", v)}
            />
            <Divider />
            <SettingToggle
              icon="mail-outline"
              label="Email Notifications"
              value={prefs.email_notifications}
              onToggle={(v) => handleToggle("email_notifications", v)}
            />
            <Divider />
            <SettingToggle
              icon="chatbubble-ellipses-outline"
              label="SMS Notifications"
              value={prefs.sms_notifications}
              onToggle={(v) => handleToggle("sms_notifications", v)}
            />
            <Divider />
            <SettingToggle
              icon="calendar-outline"
              label="Booking Updates"
              value={prefs.booking_updates}
              onToggle={(v) => handleToggle("booking_updates", v)}
            />
            <Divider />
            <SettingToggle
              icon="pricetag-outline"
              label="Promotional Offers"
              value={prefs.promotional_offers}
              onToggle={(v) => handleToggle("promotional_offers", v)}
            />
          </Surface>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>PREFERENCES</Text>
          <Surface style={styles.card} elevation={1}>
            <View style={styles.row}>
              <View style={styles.rowIcon}>
                <Ionicons name="language-outline" size={20} color="#64748b" />
              </View>
              <View style={styles.rowContent}>
                <Text style={styles.rowLabel}>Language</Text>
                <Text style={styles.rowValue}>
                  {settings?.language === "ne" ? "Nepali" : "English"}
                </Text>
              </View>
              <View style={styles.langButtons}>
                <Button
                  mode={settings?.language === "en" ? "contained" : "outlined"}
                  onPress={() => handleLanguageChange("en")}
                  style={styles.langBtn}
                  labelStyle={styles.langBtnLabel}
                  buttonColor={settings?.language === "en" ? "#1e3a8a" : undefined}
                  textColor={settings?.language === "en" ? "#fff" : "#1e3a8a"}
                  compact
                >
                  EN
                </Button>
                <Button
                  mode={settings?.language === "ne" ? "contained" : "outlined"}
                  onPress={() => handleLanguageChange("ne")}
                  style={styles.langBtn}
                  labelStyle={styles.langBtnLabel}
                  buttonColor={settings?.language === "ne" ? "#1e3a8a" : undefined}
                  textColor={settings?.language === "ne" ? "#fff" : "#1e3a8a"}
                  compact
                >
                  NE
                </Button>
              </View>
            </View>
          </Surface>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>SUPPORT</Text>
          <Surface style={styles.card} elevation={1}>
            <View style={styles.row}>
              <View style={styles.rowIcon}>
                <Ionicons name="call-outline" size={20} color="#64748b" />
              </View>
              <View style={styles.rowContent}>
                <Text style={styles.rowLabel}>Contact Support</Text>
                <Text style={styles.rowValue}>+977-1-4XXXXXX</Text>
              </View>
            </View>
            <Divider />
            <View style={styles.row}>
              <View style={styles.rowIcon}>
                <Ionicons name="mail-outline" size={20} color="#64748b" />
              </View>
              <View style={styles.rowContent}>
                <Text style={styles.rowLabel}>Email</Text>
                <Text style={styles.rowValue}>support@setihimalayan.com</Text>
              </View>
            </View>
            <Divider />
            <View style={styles.row}>
              <View style={styles.rowIcon}>
                <Ionicons name="information-circle-outline" size={20} color="#64748b" />
              </View>
              <View style={styles.rowContent}>
                <Text style={styles.rowLabel}>App Version</Text>
                <Text style={styles.rowValue}>2.0.0</Text>
              </View>
            </View>
          </Surface>
        </View>

        <Text style={styles.version}>Seti Himalayan Tours & Travels</Text>
        <View style={styles.bottomSpacer} />
      </ScrollView>

      <Modal visible={pwModal} animationType="slide" transparent={true} onDismiss={() => setPwModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Change Password</Text>
              <Button compact onPress={() => setPwModal(false)} icon="close">
                Close
              </Button>
            </View>
            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={styles.fieldLabel}>Current Password</Text>
              <TextInput
                style={styles.input}
                value={pwForm.currentPassword}
                onChangeText={(v) => setPwForm({ ...pwForm, currentPassword: v })}
                placeholder="Enter current password"
                secureTextEntry
                mode="flat"
                underlineStyle={{ display: 'none' }}
              />
              <Text style={styles.fieldLabel}>New Password</Text>
              <TextInput
                style={styles.input}
                value={pwForm.newPassword}
                onChangeText={(v) => setPwForm({ ...pwForm, newPassword: v })}
                placeholder="Enter new password"
                secureTextEntry
                mode="flat"
                underlineStyle={{ display: 'none' }}
              />
              <Text style={styles.fieldLabel}>Confirm New Password</Text>
              <TextInput
                style={styles.input}
                value={pwForm.confirmPassword}
                onChangeText={(v) => setPwForm({ ...pwForm, confirmPassword: v })}
                placeholder="Confirm new password"
                secureTextEntry
                mode="flat"
                underlineStyle={{ display: 'none' }}
              />
              <Button
                mode="contained"
                onPress={handleChangePassword}
                style={styles.saveButton}
                loading={changingPw}
                disabled={changingPw}
                buttonColor="#1e3a8a"
              >
                Update Password
              </Button>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {error && (
        <Snackbar visible={!!error} onDismiss={() => setError(null)} duration={3000} style={styles.snackbarError}>
          {error}
        </Snackbar>
      )}
      {successMsg && (
        <Snackbar visible={!!successMsg} onDismiss={() => setSuccessMsg(null)} duration={3000} style={styles.snackbarSuccess}>
          {successMsg}
        </Snackbar>
      )}
    </SafeAreaView>
  );
}

function SettingToggle({ icon, label, value, onToggle }) {
  return (
    <View style={styles.row}>
      <View style={styles.rowIcon}>
        <Ionicons name={icon} size={20} color="#64748b" />
      </View>
      <View style={styles.rowContent}>
        <Text style={styles.rowLabel}>{label}</Text>
      </View>
      <Switch
        value={!!value}
        onValueChange={onToggle}
        color="#1e3a8a"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f8fafc",
  },
  scrollContent: {
    padding: 20,
  },
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    color: "#94a3b8",
    fontWeight: "bold",
    letterSpacing: 1,
    marginLeft: 12,
    marginBottom: 12,
    fontSize: 11,
  },
  card: {
    backgroundColor: "white",
    borderRadius: 24,
    overflow: "hidden",
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  rowIcon: {
    width: 36,
    alignItems: "center",
  },
  rowContent: {
    flex: 1,
    marginLeft: 12,
  },
  rowLabel: {
    fontSize: 14,
    color: "#0f172a",
    fontWeight: "600",
  },
  rowValue: {
    fontSize: 12,
    color: "#94a3b8",
    marginTop: 2,
  },
  langButtons: {
    flexDirection: "row",
    gap: 8,
  },
  langBtn: {
    borderRadius: 8,
    minWidth: 48,
  },
  langBtnLabel: {
    fontSize: 12,
    fontWeight: "bold",
  },
  version: {
    textAlign: "center",
    color: "#cbd5e1",
    marginTop: 16,
    fontWeight: "bold",
    fontSize: 12,
  },
  bottomSpacer: {
    height: 60,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  modalContent: {
    backgroundColor: "white",
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    maxHeight: "70%",
    padding: 24,
    paddingBottom: 40,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#0f172a",
  },
  fieldLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: "#64748b",
    marginBottom: 6,
    marginTop: 12,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  input: {
    backgroundColor: "#f8fafc",
    borderRadius: 12,
    paddingHorizontal: 16,
    height: 48,
    fontSize: 15,
    color: "#0f172a",
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  saveButton: {
    marginTop: 24,
    borderRadius: 12,
    paddingVertical: 6,
  },
  snackbarError: {
    backgroundColor: "#dc2626",
  },
  snackbarSuccess: {
    backgroundColor: "#16a34a",
  },
});
