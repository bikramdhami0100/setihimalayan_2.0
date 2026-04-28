import { Redirect } from "expo-router";
import { useContext } from "react";
import { AuthContext } from "../context/AuthContext";
import { View, ActivityIndicator } from "react-native";

export default function Index() {
  const { user, isLoading } = useContext(AuthContext);

  if (isLoading) {
    return (
      <View className="flex-1 justify-center items-center bg-white">
        <ActivityIndicator size="large" color="#1d3557" />
      </View>
    );
  }

  // Redirect based on role or login status
  if (!user) {
    return <Redirect href="/(customer)" />; // Guest access to search
  }

  if (user.role === "admin" || user.role === "super_admin") {
    return <Redirect href="/(admin)/dashboard" />;
  }

  return <Redirect href="/(customer)" />;
}
