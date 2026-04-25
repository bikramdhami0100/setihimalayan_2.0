import React, { useState, useEffect } from "react";
import { View, Text, SafeAreaView, ScrollView, TouchableOpacity, ActivityIndicator, Alert, KeyboardAvoidingView, Platform } from "react-native";
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
    <SafeAreaView style={{ flex: 1 }} className="bg-[#f8fafc]">
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
      >
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{ flexGrow: 1, paddingBottom: 40 }}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Decorative Top Background */}
          <View className="absolute top-[-200] right-[-100] w-[500] h-[500] rounded-full bg-blue-50 opacity-50" />

          <View className="px-6 pt-10 pb-6">
            <TouchableOpacity
              onPress={() => router.push("/login")}
              className="w-12 h-12 bg-white rounded-full items-center justify-center shadow-sm border border-gray-100 mb-8"
            >
              <Ionicons name="arrow-back" size={24} color="#1e3a8a" />
            </TouchableOpacity>

            <Text className="text-[#1e3a8a] text-3xl font-black mb-2">
              {isTokenReset ? "Reset Password" : "Update Security"}
            </Text>
            <Text className="text-gray-500 text-base font-medium leading-5">
              {isTokenReset
                ? "Enter your new password below to regain access to your account."
                : "Choose a strong password to ensure your travel account remains secure."}
            </Text>
          </View>

          <Animated.View entering={FadeInUp.duration(800).delay(200)} className="px-6">
            <View className="bg-white rounded-[40px] p-8 shadow-sm border border-gray-100">

              <View className="items-center mb-8">
                <View className="w-20 h-20 bg-slate-50 rounded-3xl items-center justify-center">
                  <MaterialCommunityIcons
                    name={isTokenReset ? "lock-reset" : "shield-lock-outline"}
                    size={42}
                    color="#1e3a8a"
                  />
                </View>
              </View>

              {/* Current Password - Only show if NOT a token reset */}
              {!isTokenReset && (
                <TextInput
                  label="Email"
                  value={email}
                  onChangeText={setEmail}
                  mode="outlined"
                  left={<TextInput.Icon icon="email-outline" color="#64748b" />}
                  style={{ backgroundColor: 'white', marginBottom: 20 }}
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
                style={{ backgroundColor: 'white', marginBottom: 20 }}
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
                style={{ backgroundColor: 'white', marginBottom: 30 }}
                outlineColor="#e2e8f0"
                activeOutlineColor="#1e3a8a"
                outlineStyle={{ borderRadius: 16 }}
              />

              <TouchableOpacity
                onPress={handleUpdate}
                disabled={loading}
                className={`bg-[#1e3a8a] rounded-2xl py-5 items-center shadow-lg shadow-blue-200 ${loading ? 'opacity-70' : ''}`}
              >
                {loading ? (
                  <ActivityIndicator color="white" />
                ) : (
                  <Text className="text-white text-lg font-black tracking-tight">
                    {isTokenReset ? "Set New Password" : "Change Password"}
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          </Animated.View>

          <View className="flex-row justify-center mt-auto py-10">
            <Text className="text-gray-500 font-medium">Locked out? </Text>
            <TouchableOpacity onPress={() => router.push("/(customer)/profile")}>
              <Text className="text-[#0ea5e9] font-black">Support Center</Text>
            </TouchableOpacity>
          </View>

        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
