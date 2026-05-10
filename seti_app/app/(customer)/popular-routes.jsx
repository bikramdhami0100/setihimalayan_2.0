import React, { useEffect } from "react";
import {
  View,
  Text,
  SafeAreaView,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  ImageBackground,
  StatusBar,
  StyleSheet,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useCustomerData } from "../../context/CustomerContext";
import dayjs from "dayjs";

export default function PopularRoutesScreen() {
  const { popularRoutes, loading, fetchPopularRoutes } = useCustomerData();

  useEffect(() => {
    fetchPopularRoutes();
  }, []);

  const handleRoutePress = (route) => {
    router.push({
      pathname: "/(customer)/search-results/all",
      params: {
        origin: route.origin,
        destination: route.destination,
        date: dayjs().format("YYYY-MM-DD"),
      },
    });
  };

  const renderRouteCard = ({ item }) => (
    <TouchableOpacity
      onPress={() => handleRoutePress(item)}
      style={styles.card}
    >
      <ImageBackground
        source={{
          uri: item.route_image ||
            `https://source.unsplash.com/featured/?${item.origin},${item.destination},bus`,
        }}
        style={styles.cardImage}
      >
        <View style={styles.cardOverlay} />
        <View style={styles.cardImageContent}>
          <Text style={styles.cardRouteText}>
            {item.origin} → {item.destination}
          </Text>
          <View style={styles.popularBadge}>
            <Text style={styles.popularBadgeText}>Popular</Text>
          </View>
        </View>
      </ImageBackground>
      <View style={styles.cardFooter}>
        <View style={styles.durationRow}>
          <Ionicons name="time-outline" size={14} color="#64748b" />
          <Text style={styles.durationText}>
            ~{Math.floor(item.duration_minutes / 60)}h {item.duration_minutes % 60 > 0 ? `${item.duration_minutes % 60}m` : ""}
          </Text>
        </View>
        <Text style={styles.priceText}>
          NPR {parseInt(item.base_price || item.average_revenue || 1200).toLocaleString()}
        </Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#f8fafc" />
      {loading.popularRoutes ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color="#38bdf8" />
        </View>
      ) : popularRoutes?.length === 0 ? (
        <View style={styles.centerContainer}>
          <Ionicons name="map-outline" size={48} color="#94a3b8" />
          <Text style={styles.emptyText}>No popular routes available</Text>
        </View>
      ) : (
        <FlatList
          data={popularRoutes}
          keyExtractor={(item) => item.route_id?.toString()}
          renderItem={renderRouteCard}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f8fafc",
  },
  centerContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  emptyText: {
    color: "#64748b",
    fontSize: 15,
    marginTop: 12,
  },
  listContent: {
    padding: 20,
    paddingBottom: 32,
  },
  card: {
    backgroundColor: "#ffffff",
    borderRadius: 20,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
    marginBottom: 14,
  },
  cardImage: {
    height: 140,
    justifyContent: "flex-end",
    padding: 14,
  },
  cardOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0,0,0,0.35)",
  },
  cardImageContent: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
  },
  cardRouteText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "800",
  },
  popularBadge: {
    backgroundColor: "#38bdf8",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  popularBadgeText: {
    color: "#ffffff",
    fontSize: 10,
    fontWeight: "800",
  },
  cardFooter: {
    padding: 14,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  durationRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  durationText: {
    color: "#64748b",
    fontSize: 13,
  },
  priceText: {
    color: "#f97316",
    fontSize: 16,
    fontWeight: "800",
  },
});
