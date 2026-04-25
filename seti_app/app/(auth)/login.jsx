import React, { useState, useContext } from "react";
import { View, SafeAreaView, ScrollView, StyleSheet, KeyboardAvoidingView, Platform, Dimensions, TouchableOpacity, ActivityIndicator } from "react-native";
import { Text, TextInput, Button, Surface, IconButton, Checkbox, Divider, Snackbar } from "react-native-paper";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { router } from "expo-router";
import Animated, { FadeInUp } from "react-native-reanimated";
import { AuthContext } from "../../context/AuthContext";
import { setItem } from "../../utils/storage";

const { width, height } = Dimensions.get("window");

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [snackbarVisible, setSnackbarVisible] = useState(false);

  const { login, isLoading, error, clearError } = useContext(AuthContext);

  const handleLogin = async () => {
    if (!email || !password) return;

    const result = await login(email, password);
    // setItem("user", JSON.stringify(result.user));   // Store user data for session persistence, adjust as needed
    console.log(result.user)
    if (result.success) {
      const isAdmin = result.user?.role === 'admin' || result.user?.role === 'super_admin';
      if (isAdmin) {
        router.replace("/(admin)/dashboard");
      } else {
        router.replace("/(customer)/");
      }
    } else {
      setSnackbarVisible(true);
    }
  };

  return (
    <>
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
              <IconButton
                icon="bus"
                size={48}
                iconColor="#1e3a8a"
                style={styles.logoIcon}
              />
              <Text variant="headlineLarge" style={styles.title}>Seti Himalayan</Text>
              <Text variant="bodyMedium" style={styles.subtitle}>Premium Bus Travel Experience</Text>
            </View>

            <Animated.View entering={FadeInUp.duration(800).delay(200)}>
              <Surface style={styles.card} elevation={1}>
                <Text variant="headlineSmall" style={styles.cardTitle}>Welcome Back</Text>
                <Text variant="bodySmall" style={styles.cardSubtitle}>Sign in to your account to manage bookings</Text>

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

                <TextInput
                  label="Password"
                  value={password}
                  onChangeText={setPassword}
                  mode="outlined"
                  secureTextEntry={!showPassword}
                  left={<TextInput.Icon icon="lock" color="#64748b" />}
                  right={<TextInput.Icon icon={showPassword ? "eye-off" : "eye"} onPress={() => setShowPassword(!showPassword)} color="#64748b" />}
                  style={styles.input}
                  outlineColor="#e2e8f0"
                  activeOutlineColor="#1e3a8a"
                />

                <View style={styles.row}>
                  <View style={styles.rememberMe}>
                    <Checkbox
                      status={rememberMe ? 'checked' : 'unchecked'}
                      onPress={() => setRememberMe(!rememberMe)}
                      color="#1e3a8a"
                    />
                    <Text variant="bodySmall" style={styles.rememberMeText} onPress={() => setRememberMe(!rememberMe)}>Remember me</Text>
                  </View>
                  <TouchableOpacity onPress={() => router.push("/(auth)/forgot-password")}>
                    <Text variant="bodySmall" style={styles.forgotText}>Forgot Password?</Text>
                  </TouchableOpacity>
                </View>

                <Button
                  mode="contained"
                  onPress={handleLogin}
                  style={styles.loginButton}
                  labelStyle={styles.loginButtonLabel}
                  contentStyle={styles.loginButtonContent}
                  disabled={isLoading}
                >
                  {isLoading ? <ActivityIndicator color="white" /> : "Login"}
                </Button>

                <View style={styles.dividerContainer}>
                  <Divider style={styles.divider} />
                  <Text variant="bodySmall" style={styles.dividerText}>OR CONTINUE WITH</Text>
                  <Divider style={styles.divider} />
                </View>

                <View style={styles.socialRow}>
                  <Button
                    mode="outlined"
                    icon="google"
                    style={styles.socialButton}
                    textColor="#1f2937"
                    onPress={() => { }}
                  >
                    Google
                  </Button>
                  <Button
                    mode="outlined"
                    icon="facebook"
                    style={styles.socialButton}
                    textColor="#1877f2"
                    onPress={() => { }}
                  >
                    Facebook
                  </Button>
                </View>
              </Surface>
            </Animated.View>

            <View style={styles.footer}>
              <Text variant="bodyMedium" style={styles.footerText}>
                Don't have an account?
              </Text>
              <TouchableOpacity onPress={() => router.push("/(auth)/register")}>
                <Text variant="bodyMedium" style={styles.signUpText}> Sign Up</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.securityBadge}>
              <MaterialCommunityIcons name="shield-check" size={16} color="#0284c7" />
              <Text style={styles.securityText}>SECURE & ENCRYPTED BOOKING</Text>
            </View>

          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
      <Snackbar
        visible={snackbarVisible}
        onDismiss={() => {
          setSnackbarVisible(false);
          clearError();
        }}
        action={{
          label: 'OK',
          onPress: () => setSnackbarVisible(false),
        }}
        style={{ backgroundColor: '#1e293b' }}
      >
        {error}
      </Snackbar>
    </>
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
    right: -width * 0.2,
    width: width * 1.2,
    height: width * 1.2,
    borderRadius: width * 0.6,
    backgroundColor: "#e0f2fe",
    zIndex: -1,
  },
  headerContainer: {
    alignItems: "center",
    marginTop: 60,
    marginBottom: 40,
  },
  logoIcon: {
    backgroundColor: "white",
    elevation: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  title: {
    color: "#1e3a8a",
    fontSize: 32,
    fontWeight: "900",
    marginTop: 10,
    textAlign: 'center',
  },
  subtitle: {
    color: "#64748b",
    marginTop: 5,
    fontWeight: "600",
    fontSize: 14,
    textAlign: 'center',
  },
  card: {
    marginHorizontal: 24,
    padding: 30,
    borderRadius: 32,
    backgroundColor: "white",
    elevation: 4,
    shadowColor: "#1e3a8a",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.1,
    shadowRadius: 20,
  },
  cardTitle: {
    fontWeight: "900",
    color: "#0f172a",
    textAlign: "center",
    fontSize: 22,
  },
  cardSubtitle: {
    color: "#94a3b8",
    textAlign: "center",
    marginBottom: 30,
    marginTop: 8,
    fontSize: 12,
    fontWeight: "600",
  },
  input: {
    backgroundColor: "white",
    marginBottom: 16,
    fontSize: 14,
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 24,
  },
  rememberMe: {
    flexDirection: "row",
    alignItems: "center",
    marginLeft: -8,
  },
  rememberMeText: {
    color: "#64748b",
    fontSize: 12,
    fontWeight: "600",
  },
  forgotText: {
    color: "#3b82f6",
    fontWeight: "800",
    fontSize: 12,
  },
  loginButton: {
    borderRadius: 16,
    backgroundColor: "#1e3a8a",
    marginBottom: 24,
    elevation: 8,
    shadowColor: "#1e3a8a",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  loginButtonContent: {
    paddingVertical: 10,
  },
  loginButtonLabel: {
    fontSize: 16,
    fontWeight: "900",
    color: "white",
    letterSpacing: 0.5,
  },
  dividerContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 24,
  },
  divider: {
    flex: 1,
    height: 1,
    backgroundColor: "#e2e8f0",
  },
  dividerText: {
    marginHorizontal: 16,
    color: "#94a3b8",
    fontWeight: "800",
    fontSize: 10,
    letterSpacing: 1.5,
  },
  socialRow: {
    flexDirection: "row",
    gap: 12,
  },
  socialButton: {
    flex: 1,
    borderRadius: 14,
    borderColor: "#e2e8f0",
    borderWidth: 1.5,
  },
  footer: {
    flexDirection: "row",
    justifyContent: "center",
    marginTop: 30,
    alignItems: "center",
  },
  footerText: {
    color: "#64748b",
    fontSize: 14,
    fontWeight: "500",
  },
  signUpText: {
    color: "#3b82f6",
    fontWeight: "900",
    fontSize: 14,
  },
  securityBadge: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 40,
    backgroundColor: "#eff6ff",
    alignSelf: "center",
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 100,
    borderWidth: 1,
    borderColor: "#dbeafe",
  },
  securityText: {
    fontSize: 10,
    fontWeight: "900",
    color: "#1e40af",
    marginLeft: 8,
    letterSpacing: 1,
  },
});
