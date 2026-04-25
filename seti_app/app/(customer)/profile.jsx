import React, { useContext } from "react";
import { View, SafeAreaView, ScrollView, StyleSheet, TouchableOpacity, Dimensions } from "react-native";
import { Text, Surface, Avatar, List, Divider, Button, IconButton, useTheme } from "react-native-paper";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { router } from "expo-router";
import { AuthContext } from "../../context/AuthContext";

const { width } = Dimensions.get("window");

export default function ProfileScreen() {
  const { user, logout } = useContext(AuthContext);
  const theme = useTheme();

  const displayName = user?.name || "Bikram Dhami";
  const displayEmail = user?.email || "bikram@example.com";
  const initial = displayName.charAt(0).toUpperCase();

  const handleLogout = () => {
    logout();
    router.replace("/(auth)/login");
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        
        {/* Profile Header Card */}
        <Surface style={styles.headerCard} elevation={2}>
          <View style={styles.headerTop}>
            <IconButton icon="dots-vertical" onPress={() => {}} />
          </View>
          
          <View style={styles.profileInfo}>
            <Avatar.Text 
                size={80} 
                label={initial} 
                style={styles.avatar} 
                labelStyle={styles.avatarLabel}
            />
            <Text variant="headlineSmall" style={styles.name}>{displayName}</Text>
            <Text variant="bodyMedium" style={styles.email}>{displayEmail}</Text>
            
            <Button 
                mode="outlined" 
                onPress={() => {}} 
                style={styles.editButton}
                labelStyle={styles.editButtonLabel}
            >
              Edit Profile
            </Button>
          </View>

          <View style={styles.statsContainer}>
            <View style={styles.statItem}>
              <Text variant="titleLarge" style={styles.statValue}>12</Text>
              <Text variant="bodySmall" style={styles.statLabel}>Trips</Text>
            </View>
            <Divider style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text variant="titleLarge" style={styles.statValue}>2.4k</Text>
              <Text variant="bodySmall" style={styles.statLabel}>KM</Text>
            </View>
            <Divider style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text variant="titleLarge" style={styles.statValue}>4</Text>
              <Text variant="bodySmall" style={styles.statLabel}>Coupons</Text>
            </View>
          </View>
        </Surface>

        {/* Menu Sections */}
        <View style={styles.menuSection}>
          <Text variant="titleSmall" style={styles.sectionTitle}>MY JOURNEY</Text>
          <Surface style={styles.menuCard} elevation={1}>
            <List.Item
              title="My Bookings"
              description="Manage your active and past trips"
              left={props => <List.Icon {...props} icon="ticket-confirmation-outline" color="#1e3a8a" />}
              right={props => <List.Icon {...props} icon="chevron-right" />}
              onPress={() => router.push("/(customer)/my-bookings")}
            />
            <Divider />
            <List.Item
              title="Saved Passengers"
              description="Quickly book for family & friends"
              left={props => <List.Icon {...props} icon="account-group-outline" color="#1e3a8a" />}
              right={props => <List.Icon {...props} icon="chevron-right" />}
              onPress={() => {}}
            />
            <Divider />
            <List.Item
              title="Refunds & Cancellations"
              description="Track your refund status"
              left={props => <List.Icon {...props} icon="cash-refresh" color="#1e3a8a" />}
              right={props => <List.Icon {...props} icon="chevron-right" />}
              onPress={() => {}}
            />
          </Surface>
        </View>

        <View style={styles.menuSection}>
          <Text variant="titleSmall" style={styles.sectionTitle}>PAYMENTS & OFFERS</Text>
          <Surface style={styles.menuCard} elevation={1}>
            <List.Item
              title="Payment Methods"
              description="Cards, Wallets & Bank Accounts"
              left={props => <List.Icon {...props} icon="credit-card-outline" color="#0891b2" />}
              right={props => <List.Icon {...props} icon="chevron-right" />}
              onPress={() => {}}
            />
            <Divider />
            <List.Item
              title="Privacy Policy"
              description="Read our privacy policy"
              left={props => <List.Icon {...props} icon="shield-checkmark-outline" color="#0891b2" />}
              right={props => <List.Icon {...props} icon="chevron-right" />}
              onPress={() => router.push("/(customer)/privacy-policy")}
            />
          </Surface>
        </View>

        <View style={styles.menuSection}>
          <Text variant="titleSmall" style={styles.sectionTitle}>PREFERENCES</Text>
          <Surface style={styles.menuCard} elevation={1}>
            <List.Item
              title="Notifications"
              left={props => <List.Icon {...props} icon="bell-outline" color="#475569" />}
              right={props => <List.Icon {...props} icon="chevron-right" />}
              onPress={() => {}}
            />
            <Divider />
            <List.Item
              title="Language"
              description="English"
              left={props => <List.Icon {...props} icon="translate" color="#475569" />}
              right={props => <List.Icon {...props} icon="chevron-right" />}
              onPress={() => {}}
            />
            <Divider />
            <List.Item
              title="Help & Support"
              left={props => <List.Icon {...props} icon="help-circle-outline" color="#475569" />}
              right={props => <List.Icon {...props} icon="chevron-right" />}
              onPress={() => {}}
            />
          </Surface>
        </View>

        <Button 
            mode="contained" 
            onPress={handleLogout} 
            style={styles.logoutButton}
            buttonColor="#fee2e2"
            textColor="#dc2626"
            icon="logout"
        >
          Sign Out
        </Button>

        <Text variant="bodySmall" style={styles.version}>Seti Himalayan v1.2.4</Text>
        
        <View style={styles.bottomSpacer} />
      </ScrollView>
    </SafeAreaView>
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
  headerCard: {
    backgroundColor: "white",
    borderRadius: 32,
    paddingBottom: 24,
    marginBottom: 24,
    overflow: "hidden",
  },
  headerTop: {
    flexDirection: "row",
    justifyContent: "flex-end",
    padding: 8,
  },
  profileInfo: {
    alignItems: "center",
    marginTop: -20,
  },
  avatar: {
    backgroundColor: "#1e3a8a",
    elevation: 8,
    shadowColor: "#1e3a8a",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  avatarLabel: {
    fontWeight: "bold",
    fontSize: 32,
  },
  name: {
    fontWeight: "900",
    color: "#0f172a",
    marginTop: 16,
  },
  email: {
    color: "#64748b",
    marginBottom: 20,
  },
  editButton: {
    borderRadius: 12,
    borderColor: "#e2e8f0",
  },
  editButtonLabel: {
    fontSize: 12,
    fontWeight: "bold",
  },
  statsContainer: {
    flexDirection: "row",
    justifyContent: "space-around",
    alignItems: "center",
    marginTop: 30,
    paddingHorizontal: 20,
  },
  statItem: {
    alignItems: "center",
    flex: 1,
  },
  statValue: {
    fontWeight: "bold",
    color: "#1e3a8a",
  },
  statLabel: {
    color: "#94a3b8",
    fontWeight: "bold",
    textTransform: "uppercase",
    fontSize: 9,
    marginTop: 2,
  },
  statDivider: {
    height: 30,
    width: 1,
    backgroundColor: "#f1f5f9",
  },
  menuSection: {
    marginBottom: 24,
  },
  sectionTitle: {
    color: "#94a3b8",
    fontWeight: "bold",
    letterSpacing: 1,
    marginLeft: 12,
    marginBottom: 12,
  },
  menuCard: {
    backgroundColor: "white",
    borderRadius: 24,
    overflow: "hidden",
  },
  logoutButton: {
    marginTop: 12,
    borderRadius: 16,
    paddingVertical: 4,
  },
  version: {
    textAlign: "center",
    color: "#cbd5e1",
    marginTop: 32,
    fontWeight: "bold",
  },
  bottomSpacer: {
    height: 60,
  }
});
