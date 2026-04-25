import React, { useState } from "react";
import { View, SafeAreaView, ScrollView, StyleSheet, KeyboardAvoidingView, Platform, Dimensions, TouchableOpacity, ActivityIndicator, Alert } from "react-native";
import { Text, TextInput, Button, Surface, IconButton } from "react-native-paper";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { router } from "expo-router";
import Animated, { FadeInUp } from "react-native-reanimated";
import { resetPassword } from "../../api/auth";

const { width, height } = Dimensions.get("window");

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);

  const handleReset = async () => {
    if (!email) {
      Alert.alert("Error", "Please enter your email address");
      return;
    }

    setLoading(true);
    try {
      const data = await resetPassword(email);
      console.log("data", data);
      Alert.alert(
        "Success",
        "Reset link has been sent to your email.",
        [{ text: "OK", onPress: () => router.push("/(auth)/login") }]
      );
    } catch (err) {
      Alert.alert("Error", err.response?.data?.message || "Failed to send reset link");
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Top Decorative Element */}
          <View style={styles.topCircle} />

          <View style={styles.headerContainer}>
            <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
              <Ionicons name="arrow-back" size={24} color="#1e3a8a" />
            </TouchableOpacity>
            <Text variant="headlineLarge" style={styles.title}>Reset Password</Text>
            <Text variant="bodyMedium" style={styles.subtitle}>Recover your travel account securely</Text>
          </View>

          <Animated.View entering={FadeInUp.duration(800).delay(200)}>
            <Surface style={styles.card} elevation={1}>

              <View style={styles.iconContainer}>
                <View style={styles.iconCircle}>
                  <MaterialCommunityIcons name="lock-reset" size={40} color="#1e3a8a" />
                </View>
                <Text variant="bodyMedium" style={styles.instructionText}>
                  Enter your email address and we'll send you instructions to reset your password.
                </Text>
              </View>

              <TextInput
                label="Email Address"
                value={email}
                onChangeText={setEmail}
                mode="outlined"
                autoCapitalize="none"
                keyboardType="email-address"
                left={<TextInput.Icon icon="email" color="#64748b" />}
                style={styles.input}
                outlineColor="#e2e8f0"
                activeOutlineColor="#1e3a8a"
              />

              <Button
                mode="contained"
                onPress={handleReset}
                style={styles.resetButton}
                labelStyle={styles.buttonLabel}
                contentStyle={styles.buttonContent}
                disabled={loading}
              >
                {loading ? <ActivityIndicator color="white" /> : "Send Reset Link"}
              </Button>
            </Surface>
          </Animated.View>

          <View style={styles.footer}>
            <Text variant="bodyMedium" style={styles.footerText}>
              Remember your password?
            </Text>
            <TouchableOpacity onPress={() => router.push("/(auth)/login")}>
              <Text variant="bodyMedium" style={styles.loginText}> Login</Text>
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
    backgroundColor: "#f8fafc",
  },
  scrollContent: {
    paddingBottom: 40,
    minHeight: height,
  },
  topCircle: {
    position: "absolute",
    top: -width * 0.4,
    left: -width * 0.2,
    width: width * 1.2,
    height: width * 1.2,
    borderRadius: width * 0.6,
    backgroundColor: "#eff6ff",
    zIndex: -1,
  },
  headerContainer: {
    paddingHorizontal: 24,
    marginTop: 40,
    marginBottom: 30,
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "white",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 20,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  title: {
    color: "#1e3a8a",
    fontWeight: "900",
  },
  subtitle: {
    color: "#64748b",
    marginTop: 5,
    fontWeight: "500",
  },
  card: {
    marginHorizontal: 24,
    padding: 30,
    borderRadius: 32,
    backgroundColor: "white",
  },
  iconContainer: {
    alignItems: "center",
    marginBottom: 30,
  },
  iconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "#f1f5f9",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  instructionText: {
    textAlign: "center",
    color: "#64748b",
    lineHeight: 20,
  },
  input: {
    backgroundColor: "white",
    marginBottom: 24,
  },
  resetButton: {
    borderRadius: 16,
    backgroundColor: "#1e3a8a",
  },
  buttonContent: {
    paddingVertical: 8,
  },
  buttonLabel: {
    fontSize: 18,
    fontWeight: "bold",
  },
  footer: {
    flexDirection: "row",
    justifyContent: "center",
    marginTop: 40,
  },
  footerText: {
    color: "#64748b",
  },
  loginText: {
    color: "#0ea5e9",
    fontWeight: "bold",
  },
});
