import React, { useEffect } from "react";
import { MaterialTopTabs } from "../../../components/MaterialTopTabs";
import { useLocalSearchParams, router } from "expo-router";
import { useSearchData } from "../../../context/SearchContext";
import { View, Text, TouchableOpacity, SafeAreaView, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";

export default function SearchResultsLayout() {
  const { origin, destination, date } = useLocalSearchParams();
  const { performSearch } = useSearchData();

  useEffect(() => {
    if (origin && destination && date) {
      performSearch(origin, destination, date);
    }
  }, [origin, destination, date]);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color="#1e3a8a" />
        </TouchableOpacity>
        <View>
          <Text style={styles.title}>Search Results</Text>
          <Text style={styles.subtitle}>{origin} → {destination}</Text>
        </View>
      </View>

      <MaterialTopTabs
        screenOptions={{
          tabBarActiveTintColor: "#1e3a8a",
          tabBarInactiveTintColor: "#64748b",
          tabBarLabelStyle: { fontSize: 13, fontWeight: "bold", textTransform: "none" },
          tabBarIndicatorStyle: { backgroundColor: "#1e3a8a", height: 3 },
          tabBarStyle: { backgroundColor: "white", elevation: 0, shadowOpacity: 0 },
        }}
      >
        <MaterialTopTabs.Screen name="all" options={{ title: "All" }} />
        <MaterialTopTabs.Screen name="fastest" options={{ title: "Fastest" }} />
        <MaterialTopTabs.Screen name="cheapest" options={{ title: "Cheapest" }} />
      </MaterialTopTabs>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'white',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  backBtn: {
    marginRight: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1e3a8a',
  },
  subtitle: {
    fontSize: 12,
    color: '#64748b',
  },
});
