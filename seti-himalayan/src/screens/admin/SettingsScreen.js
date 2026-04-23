import React from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  Alert,
} from 'react-native';
import { Text, Card, Button, Divider, Switch } from 'react-native-paper';
import useAuthStore from '../../store/authStore';
import useUIStore from '../../store/uiStore';
import { colors } from '../../utils/colors';

export default function SettingsScreen() {
  const { logout } = useAuthStore();
  const { themeMode, setThemeMode } = useUIStore();

  const handleLogout = () => {
    Alert.alert('Logout', 'Are you sure you want to logout?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Logout', onPress: () => logout() },
    ]);
  };

  return (
    <ScrollView style={styles.container}>
      <Card style={styles.card}>
        <Card.Content>
          <Text variant="titleMedium">Appearance</Text>
          <Divider style={styles.divider} />
          <View style={styles.settingRow}>
            <Text>Dark Mode (Admin Theme)</Text>
            <Switch
              value={themeMode === 'dark'}
              onValueChange={() => setThemeMode(themeMode === 'dark' ? 'light' : 'dark')}
              color={colors.primary}
            />
          </View>
        </Card.Content>
      </Card>

      <Card style={styles.card}>
        <Card.Content>
          <Text variant="titleMedium">Account</Text>
          <Divider style={styles.divider} />
          <Button mode="outlined" onPress={() => Alert.alert('Change Password', 'Feature coming soon')} style={styles.button}>
            Change Password
          </Button>
          <Button mode="outlined" onPress={() => Alert.alert('Edit Profile', 'Feature coming soon')} style={styles.button}>
            Edit Profile
          </Button>
        </Card.Content>
      </Card>

      <Card style={styles.card}>
        <Card.Content>
          <Text variant="titleMedium">Support</Text>
          <Divider style={styles.divider} />
          <Button mode="outlined" onPress={() => Alert.alert('Contact Support', 'Email: support@setihimalayan.com')} style={styles.button}>
            Contact Support
          </Button>
          <Button mode="outlined" onPress={() => Alert.alert('About', 'Seti Himalayan Tours & Travels\nVersion 1.0.0')} style={styles.button}>
            About
          </Button>
        </Card.Content>
      </Card>

      <Card style={styles.card}>
        <Card.Content>
          <Button mode="contained" onPress={handleLogout} buttonColor={colors.error} textColor={colors.textLight} style={styles.logoutButton}>
            Logout
          </Button>
        </Card.Content>
      </Card>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  card: { margin: 16, marginBottom: 8 },
  divider: { marginVertical: 12 },
  settingRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 8 },
  button: { marginVertical: 8 },
  logoutButton: { marginTop: 8 },
});