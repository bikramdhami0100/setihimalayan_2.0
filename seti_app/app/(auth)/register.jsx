import React, { useState, useContext } from "react";
import { View, SafeAreaView, ScrollView, StyleSheet, KeyboardAvoidingView, Platform, Dimensions, TouchableOpacity, ActivityIndicator, Alert } from "react-native";
import { Text, TextInput, Button, Surface, IconButton, Checkbox, HelperText, Snackbar } from "react-native-paper";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useForm, Controller } from "react-hook-form";
import Animated, { FadeInUp } from "react-native-reanimated";
import { AuthContext } from "../../context/AuthContext";

const { width, height } = Dimensions.get("window");

export default function Register() {
  const [showPassword, setShowPassword] = useState(false);
  const [snackbarVisible, setSnackbarVisible] = useState(false);

  const { register: registerUser, isLoading, error, clearError } = useContext(AuthContext);

  const { control, handleSubmit, formState: { errors }, watch } = useForm({
    defaultValues: {
      full_name: '',
      email: '',
      phone: '',
      password: '',
      confirmPassword: ''
    }
  });

  const password = watch("password");

  const onSubmit = async (data) => {
    const result = await registerUser({
      full_name: data.full_name,
      email: data.email,
      phone: data.phone,
      password: data.password,
      role: 'passenger'
    });

    if (result.success) {
      Alert.alert("Success", "Account created successfully! Please login.", [
        { text: "Login", onPress: () => router.replace("/(auth)/login") }
      ]);
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
              <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                <Ionicons name="arrow-back" size={24} color="#1e3a8a" />
              </TouchableOpacity>
              <Text variant="headlineLarge" style={styles.title}>Create Account</Text>
              <Text variant="bodyMedium" style={styles.subtitle}>Join us for a seamless travel experience</Text>
            </View>

            <Animated.View entering={FadeInUp.duration(800).delay(200)}>
              <Surface style={styles.card} elevation={1}>

                <Controller
                  control={control}
                  rules={{ required: "Full name is required" }}
                  render={({ field: { onChange, onBlur, value } }) => (
                    <View style={styles.inputContainer}>
                      <TextInput
                        label="Full Name"
                        value={value}
                        onBlur={onBlur}
                        onChangeText={onChange}
                        mode="outlined"
                        left={<TextInput.Icon icon="account" color="#64748b" />}
                        style={styles.input}
                        outlineColor="#e2e8f0"
                        activeOutlineColor="#1e3a8a"
                        error={!!errors.full_name}
                      />
                      {errors.full_name && <HelperText type="error" visible={true}>{errors.full_name.message}</HelperText>}
                    </View>
                  )}
                  name="full_name"
                />

                <Controller
                  control={control}
                  rules={{
                    required: "Email is required",
                    pattern: {
                      value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                      message: "Invalid email address"
                    }
                  }}
                  render={({ field: { onChange, onBlur, value } }) => (
                    <View style={styles.inputContainer}>
                      <TextInput
                        label="Email Address"
                        value={value}
                        onBlur={onBlur}
                        onChangeText={onChange}
                        mode="outlined"
                        autoCapitalize="none"
                        keyboardType="email-address"
                        left={<TextInput.Icon icon="email" color="#64748b" />}
                        style={styles.input}
                        outlineColor="#e2e8f0"
                        activeOutlineColor="#1e3a8a"
                        error={!!errors.email}
                      />
                      {errors.email && <HelperText type="error" visible={true}>{errors.email.message}</HelperText>}
                    </View>
                  )}
                  name="email"
                />

                <Controller
                  control={control}
                  rules={{
                    required: "Phone number is required",
                    pattern: {
                      value: /^[0-9]{10}$/,
                      message: "Invalid phone number (10 digits)"
                    }
                  }}
                  render={({ field: { onChange, onBlur, value } }) => (
                    <View style={styles.inputContainer}>
                      <TextInput
                        label="Phone Number"
                        value={value}
                        onBlur={onBlur}
                        onChangeText={onChange}
                        mode="outlined"
                        keyboardType="phone-pad"
                        left={<TextInput.Icon icon="phone" color="#64748b" />}
                        style={styles.input}
                        outlineColor="#e2e8f0"
                        activeOutlineColor="#1e3a8a"
                        error={!!errors.phone}
                      />
                      {errors.phone && <HelperText type="error" visible={true}>{errors.phone.message}</HelperText>}
                    </View>
                  )}
                  name="phone"
                />

                <Controller
                  control={control}
                  rules={{
                    required: "Password is required",
                    minLength: { value: 6, message: "Password must be at least 6 characters" }
                  }}
                  render={({ field: { onChange, onBlur, value } }) => (
                    <View style={styles.inputContainer}>
                      <TextInput
                        label="Password"
                        value={value}
                        onBlur={onBlur}
                        onChangeText={onChange}
                        mode="outlined"
                        secureTextEntry={!showPassword}
                        left={<TextInput.Icon icon="lock" color="#64748b" />}
                        right={<TextInput.Icon icon={showPassword ? "eye-off" : "eye"} onPress={() => setShowPassword(!showPassword)} color="#64748b" />}
                        style={styles.input}
                        outlineColor="#e2e8f0"
                        activeOutlineColor="#1e3a8a"
                        error={!!errors.password}
                      />
                      {errors.password && <HelperText type="error" visible={true}>{errors.password.message}</HelperText>}
                    </View>
                  )}
                  name="password"
                />

                <Controller
                  control={control}
                  rules={{
                    validate: value => value === password || "Passwords do not match"
                  }}
                  render={({ field: { onChange, onBlur, value } }) => (
                    <View style={styles.inputContainer}>
                      <TextInput
                        label="Confirm Password"
                        value={value}
                        onBlur={onBlur}
                        onChangeText={onChange}
                        mode="outlined"
                        secureTextEntry={!showPassword}
                        left={<TextInput.Icon icon="shield-check" color="#64748b" />}
                        style={styles.input}
                        outlineColor="#e2e8f0"
                        activeOutlineColor="#1e3a8a"
                        error={!!errors.confirmPassword}
                      />
                      {errors.confirmPassword && <HelperText type="error" visible={true}>{errors.confirmPassword.message}</HelperText>}
                    </View>
                  )}
                  name="confirmPassword"
                />

                <Button
                  mode="contained"
                  onPress={handleSubmit(onSubmit)}
                  style={styles.registerButton}
                  labelStyle={styles.buttonLabel}
                  contentStyle={styles.buttonContent}
                  disabled={isLoading}
                >
                  {isLoading ? <ActivityIndicator color="white" /> : "Sign Up"}
                </Button>

                <Text variant="bodySmall" style={styles.termsText}>
                  By joining, you agree to our <Text style={styles.linkText}>Terms of Service</Text> and <Text style={styles.linkText}>Privacy Policy</Text>
                </Text>
              </Surface>
            </Animated.View>

            <View style={styles.footer}>
              <Text variant="bodyMedium" style={styles.footerText}>
                Already have an account?
              </Text>
              <TouchableOpacity onPress={() => router.push("/(auth)/login")}>
                <Text variant="bodyMedium" style={styles.signUpText}> Login</Text>
              </TouchableOpacity>
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
  },
  topCircle: {
    position: "absolute",
    top: -width * 0.5,
    left: -width * 0.3,
    width: width * 1.3,
    height: width * 1.3,
    borderRadius: width * 0.65,
    backgroundColor: "#eff6ff",
    zIndex: -1,
  },
  headerContainer: {
    paddingHorizontal: 24,
    marginTop: 20,
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
    padding: 24,
    borderRadius: 32,
    backgroundColor: "white",
  },
  inputContainer: {
    marginBottom: 12,
  },
  input: {
    backgroundColor: "white",
  },
  registerButton: {
    borderRadius: 16,
    backgroundColor: "#1e3a8a",
    marginTop: 12,
    marginBottom: 20,
  },
  buttonContent: {
    paddingVertical: 8,
  },
  buttonLabel: {
    fontSize: 18,
    fontWeight: "bold",
  },
  termsText: {
    color: "#94a3b8",
    textAlign: "center",
    lineHeight: 18,
  },
  linkText: {
    color: "#0ea5e9",
    fontWeight: "bold",
  },
  footer: {
    flexDirection: "row",
    justifyContent: "center",
    marginTop: 30,
  },
  footerText: {
    color: "#64748b",
  },
  signUpText: {
    color: "#0ea5e9",
    fontWeight: "bold",
  },
});
