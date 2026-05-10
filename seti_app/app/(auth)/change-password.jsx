import React, { useState, useEffect } from "react";
import { View, Text, SafeAreaView, ScrollView, TouchableOpacity, ActivityIndicator, Alert, KeyboardAvoidingView, Platform, StyleSheet } from "react-native";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import { TextInput } from "react-native-paper";
import Animated, { FadeInUp } from "react-native-reanimated";
import { changePassword } from "../../api/auth";
import { jwtDecode } from "jwt-decode";

export default function ChangePassword() {
  const { token } = useLocalSearchParams();
  const [email, setEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [isTokenReset, setIsTokenReset] = useState(false);

  useEffect(() => {
    if (token) {
      try {
        const decoded = jwtDecode(token);
        decoded.email && setEmail(decoded.email);
        setIsTokenReset(true);
      } catch (err) {
        Alert.alert("Invalid Link", "The reset link is invalid or has expired.");
        router.replace("/(auth)/login");
      }
    }
  }, [token]);

  const handleUpdate = async () => {
    if ((!isTokenReset && !email) || !newPassword || !confirmPassword) {
      Alert.alert("Error", "Please fill in all fields");
      return;
    }

    if (newPassword !== confirmPassword) {
      Alert.alert("Error", "Passwords do not match");
      return;
    }

    if (newPassword.length < 6) {
      Alert.alert("Error", "Password must be at least 6 characters");
      return;
    }

    setLoading(true);
    try {
      await changePassword({
        email,
        newPassword: newPassword,
        token
      });

      Alert.alert(
        "Success",
        "Your password has been updated successfully.",
        [{ text: "OK", onPress: () => router.push("/(auth)/login") }]
      );
    } catch (err) {
      Alert.alert("Error", err.response?.data?.message || "Failed to update password");
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.flex}
      >
        <ScrollView
          style={styles.flex}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.decorCircle} />

          <View style={styles.headerSection}>
            <TouchableOpacity
              onPress={() => router.push("/login")}
              style={styles.backBtn}
            >
              <Ionicons name="arrow-back" size={24} color="#1e3a8a" />
            </TouchableOpacity>

            <Text style={styles.title}>
              {isTokenReset ? "Reset Password" : "Update Security"}
            </Text>
            <Text style={styles.subtitle}>
              {isTokenReset
                ? "Enter your new password below to regain access to your account."
                : "Choose a strong password to ensure your travel account remains secure."}
            </Text>
          </View>

          <Animated.View entering={FadeInUp.duration(800).delay(200)} style={styles.formWrapper}>
            <View style={styles.formCard}>
              <View style={styles.iconSection}>
                <View style={styles.iconCircle}>
                  <MaterialCommunityIcons
                    name={isTokenReset ? "lock-reset" : "shield-lock-outline"}
                    size={42}
                    color="#1e3a8a"
                  />
                </View>
              </View>

              {!isTokenReset && (
                <TextInput
                  label="Email"
                  value={email}
                  onChangeText={setEmail}
                  mode="outlined"
                  left={<TextInput.Icon icon="email-outline" color="#64748b" />}
                  style={styles.textInputStyle}
                  outlineColor="#e2e8f0"
                  activeOutlineColor="#1e3a8a"
                  outlineStyle={{ borderRadius: 16 }}
                />
              )}

              <TextInput
                label="New Password"
                value={newPassword}
                onChangeText={setNewPassword}
                mode="outlined"
                secureTextEntry={!showNew}
                left={<TextInput.Icon icon="lock-plus-outline" color="#64748b" />}
                right={<TextInput.Icon icon={showNew ? "eye-off" : "eye"} onPress={() => setShowNew(!showNew)} color="#64748b" />}
                style={styles.textInputStyle}
                outlineColor="#e2e8f0"
                activeOutlineColor="#1e3a8a"
                outlineStyle={{ borderRadius: 16 }}
              />

              <TextInput
                label="Confirm New Password"
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                mode="outlined"
                secureTextEntry={!showNew}
                left={<TextInput.Icon icon="shield-check-outline" color="#64748b" />}
                style={[styles.textInputStyle, styles.lastInput]}
                outlineColor="#e2e8f0"
                activeOutlineColor="#1e3a8a"
                outlineStyle={{ borderRadius: 16 }}
              />

              <TouchableOpacity
                onPress={handleUpdate}
                disabled={loading}
                style={[styles.submitBtn, loading && styles.submitBtnDisabled]}
              >
                {loading ? (
                  <ActivityIndicator color="white" />
                ) : (
                  <Text style={styles.submitBtnText}>
                    {isTokenReset ? "Set New Password" : "Change Password"}
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          </Animated.View>

          <View style={styles.footer}>
            <Text style={styles.footerText}>Locked out? </Text>
            <TouchableOpacity onPress={() => router.push("/(customer)/profile")}>
              <Text style={styles.footerLink}>Support Center</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  flex: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: 40,
  },
  decorCircle: {
    position: 'absolute',
    top: -200,
    right: -100,
    width: 500,
    height: 500,
    borderRadius: 250,
    backgroundColor: '#EFF6FF',
    opacity: 0.5,
  },
  headerSection: {
    paddingHorizontal: 24,
    paddingTop: 40,
    paddingBottom: 24,
  },
  backBtn: {
    width: 48,
    height: 48,
    backgroundColor: '#FFFFFF',
    borderRadius: 9999,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    marginBottom: 32,
  },
  title: {
    color: '#1e3a8a',
    fontSize: 24,
    fontWeight: '900',
    marginBottom: 8,
  },
  subtitle: {
    color: '#64748B',
    fontSize: 14,
    fontWeight: '500',
    lineHeight: 20,
  },
  formWrapper: {
    paddingHorizontal: 24,
  },
  formCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 40,
    padding: 32,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  iconSection: {
    alignItems: 'center',
    marginBottom: 32,
  },
  iconCircle: {
    width: 80,
    height: 80,
    backgroundColor: '#F8FAFC',
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  textInputStyle: {
    backgroundColor: 'white',
    marginBottom: 20,
  },
  lastInput: {
    marginBottom: 30,
  },
  submitBtn: {
    backgroundColor: '#1e3a8a',
    borderRadius: 16,
    paddingVertical: 20,
    alignItems: 'center',
    elevation: 8,
    shadowColor: '#1e3a8a',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  submitBtnDisabled: {
    opacity: 0.7,
  },
  submitBtnText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '900',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 'auto',
    paddingVertical: 40,
  },
  footerText: {
    color: '#64748B',
    fontWeight: '500',
  },
  footerLink: {
    color: '#0ea5e9',
    fontWeight: '900',
  },
});
