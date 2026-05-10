import React, { useState, useEffect, useContext } from "react";
import {
  View,
  SafeAreaView,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  StyleSheet,
} from "react-native";
import { Text, TextInput } from "react-native-paper";
import { Ionicons } from "@expo/vector-icons";
import { AuthContext } from "../../context/AuthContext";
import { getUsers, updateUserRole } from "../../api/auth";
import { USER_ROLES } from "../../utils/constants";

const ROLE_OPTIONS = [
  USER_ROLES.PASSENGER,
  USER_ROLES.ADMIN,
  USER_ROLES.SUPER_ADMIN,
];

const roleBadgeStyle = {
  [USER_ROLES.PASSENGER]: { backgroundColor: '#F1F5F9' },
  [USER_ROLES.ADMIN]: { backgroundColor: '#DBEAFE' },
  [USER_ROLES.SUPER_ADMIN]: { backgroundColor: '#EDE9FE' },
};

const roleTextStyle = {
  [USER_ROLES.PASSENGER]: { color: '#475569' },
  [USER_ROLES.ADMIN]: { color: '#1D4ED8' },
  [USER_ROLES.SUPER_ADMIN]: { color: '#6D28D9' },
};

const AVATAR_COLORS = [
  '#3B82F6', '#10B981', '#8B5CF6',
  '#F59E0B', '#F43F5E', '#06B6D4',
];

const Avatar = ({ name }) => {
  const initials = name
    ? name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2)
    : "??";
  const colorIndex = initials.length % AVATAR_COLORS.length;
  return (
    <View style={[styles.avatar, { backgroundColor: AVATAR_COLORS[colorIndex] }]}>
      <Text style={styles.avatarText}>{initials}</Text>
    </View>
  );
};

const StatusBadge = ({ status }) => {
  const isActive = status === "active";
  return (
    <View style={[styles.statusBadge, isActive ? styles.statusBadgeActive : styles.statusBadgeInactive]}>
      <Text style={[styles.statusBadgeText, isActive ? styles.statusTextActive : styles.statusTextInactive]}>
        {status || "inactive"}
      </Text>
    </View>
  );
};

export default function RoleManagement() {
  const { user } = useContext(AuthContext);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [savingId, setSavingId] = useState(null);

  const fetchUsers = async () => {
    try {
      const res = await getUsers();
      setUsers(res.data.data.users || []);
    } catch (err) {
      Alert.alert("Error", "Failed to load users");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleRoleUpdate = async (userId, role) => {
    if (!userId || !role) return;
    setSavingId(userId);
    try {
      await updateUserRole(userId, role);
      setUsers((current) =>
        current.map((item) =>
          item.id === userId ? { ...item, role } : item
        )
      );
      Alert.alert("Success", "Role updated");
    } catch (err) {
      const message = err.response?.data?.message || "Role update failed";
      Alert.alert("Error", message);
    } finally {
      setSavingId(null);
    }
  };

  const filteredUsers = users.filter(
    (u) =>
      u.full_name?.toLowerCase().includes(search.toLowerCase()) ||
      u.email?.toLowerCase().includes(search.toLowerCase()) ||
      u.phone?.includes(search)
  );

  const renderItem = ({ item }) => {
    const isSelf = item.id === user?.id;
    const badgeBg = roleBadgeStyle[item.role] || { backgroundColor: '#F1F5F9' };
    const badgeText = roleTextStyle[item.role] || { color: '#475569' };
    const verified = item.is_email_verified;

    return (
      <View style={styles.userCard}>
        <View style={styles.userCardTop}>
          <Avatar name={item.full_name} />
          <View style={styles.userInfo}>
            <Text style={styles.userName} numberOfLines={1}>
              {item.full_name}
            </Text>
            <View style={styles.userMeta}>
              <Ionicons name="mail-outline" size={12} color="#94a3b8" />
              <Text style={styles.userMetaText} numberOfLines={1}>
                {item.email}
              </Text>
            </View>
            {item.phone && (
              <View style={styles.userMeta}>
                <Ionicons name="call-outline" size={12} color="#94a3b8" />
                <Text style={styles.userMetaText}>{item.phone}</Text>
              </View>
            )}
          </View>
          <View style={styles.badgesContainer}>
            <View style={[styles.roleBadge, badgeBg]}>
              <Text style={[styles.roleBadgeText, badgeText]}>
                {item.role.replace("_", " ")}
              </Text>
            </View>
            <View style={styles.statusBadgeWrap}>
              <StatusBadge status={item.status} />
            </View>
          </View>
        </View>

        <View style={styles.verificationRow}>
          <Ionicons
            name={verified ? "checkmark-circle" : "close-circle"}
            size={14}
            color={verified ? "#16a34a" : "#dc2626"}
          />
          <Text style={[styles.verificationText, verified ? styles.verifiedText : styles.unverifiedText]}>
            {verified ? "Email verified" : "Email not verified"}
          </Text>
        </View>

        <Text style={styles.changeRoleLabel}>
          Change role
        </Text>
        <View style={styles.roleOptions}>
          {ROLE_OPTIONS.map((roleOption) => {
            const active = item.role === roleOption;
            const disabled = savingId === item.id || active || isSelf;
            return (
              <TouchableOpacity
                key={`${item.id}-${roleOption}`}
                onPress={() => handleRoleUpdate(item.id, roleOption)}
                disabled={disabled}
                style={[
                  styles.roleOption,
                  active ? styles.roleOptionActive : styles.roleOptionInactive,
                  disabled && styles.roleOptionDisabled,
                ]}
              >
                {savingId === item.id && !active ? (
                  <ActivityIndicator size="small" color={active ? "#fff" : "#0f172a"} />
                ) : (
                  active && (
                    <Ionicons name="checkmark-circle" size={14} color="#fff" />
                  )
                )}
                <Text style={[styles.roleOptionText, active && styles.roleOptionTextActive]}>
                  {roleOption.replace("_", " ")}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
        {isSelf && (
          <Text style={styles.selfNote}>
            You can't change your own role here.
          </Text>
        )}
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.screen}>
      <View style={styles.header}>
        <View style={styles.headerRow}>
          <Ionicons name="shield-checkmark" size={28} color="#1e3a8a" />
          <Text style={styles.headerTitle}>Role Management</Text>
        </View>
        <Text style={styles.headerSubtitle}>
          Only super admins can update user roles.
        </Text>

        <View style={styles.searchBar}>
          <Ionicons name="search-outline" size={20} color="#94a3b8" />
          <TextInput
            style={styles.searchInput}
            underlineColor="transparent"
            activeUnderlineColor="transparent"
            placeholder="Search by name, email or phone..."
            placeholderTextColor="#94a3b8"
            value={search}
            onChangeText={setSearch}
            left={<TextInput.Icon icon={() => null} />}
          />
          {search.length > 0 && (
            <TouchableOpacity onPress={() => setSearch("")}>
              <Ionicons name="close-circle" size={18} color="#cbd5e1" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#1e3a8a" />
          <Text style={styles.loadingText}>Loading users...</Text>
        </View>
      ) : (
        <FlatList
          data={filteredUsers}
          renderItem={renderItem}
          keyExtractor={(item) => item.id?.toString() ?? String(item.email)}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons name="people-outline" size={64} color="#e2e8f0" />
              <Text style={styles.emptyText}>
                {search ? "No matching users" : "No users yet"}
              </Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  header: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '900',
    color: '#1e3a8a',
  },
  headerSubtitle: {
    color: '#94A3B8',
    fontSize: 10,
    fontWeight: '500',
    marginLeft: 40,
    marginBottom: 16,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 24,
    marginHorizontal: 2,
    elevation: 1,
    shadowColor: '#0f172a',
    shadowOpacity: 0.03,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
  },
  searchInput: {
    flex: 1,
    backgroundColor: 'transparent',
    marginLeft: 8,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    marginTop: 16,
    color: '#94A3B8',
    fontWeight: '700',
  },
  listContent: {
    paddingBottom: 24,
  },
  emptyContainer: {
    alignItems: 'center',
    marginTop: 80,
  },
  emptyText: {
    color: '#94A3B8',
    fontWeight: '600',
    marginTop: 16,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '900',
  },
  userCard: {
    marginHorizontal: 16,
    marginBottom: 16,
    padding: 16,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    shadowColor: '#0f172a',
    shadowOpacity: 0.04,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
    backgroundColor: '#FFFFFF',
  },
  userCardTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  userInfo: {
    flex: 1,
    marginLeft: 12,
  },
  userName: {
    fontSize: 14,
    fontWeight: '900',
    color: '#1E293B',
  },
  userMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
  },
  userMetaText: {
    fontSize: 10,
    color: '#64748B',
    marginLeft: 4,
    marginRight: 8,
  },
  badgesContainer: {
    alignItems: 'flex-end',
  },
  roleBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 9999,
  },
  roleBadgeText: {
    fontSize: 10,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  statusBadgeWrap: {
    marginTop: 4,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 9999,
  },
  statusBadgeActive: {
    backgroundColor: '#DCFCE7',
  },
  statusBadgeInactive: {
    backgroundColor: '#FEE2E2',
  },
  statusBadgeText: {
    fontSize: 9,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  statusTextActive: {
    color: '#15803D',
  },
  statusTextInactive: {
    color: '#B91C1C',
  },
  verificationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  verificationText: {
    fontSize: 10,
    fontWeight: '700',
    marginLeft: 4,
  },
  verifiedText: {
    color: '#16A34A',
  },
  unverifiedText: {
    color: '#DC2626',
  },
  changeRoleLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: '#94A3B8',
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  roleOptions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  roleOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 16,
    borderWidth: 1,
  },
  roleOptionActive: {
    backgroundColor: '#0F172A',
    borderColor: '#0F172A',
  },
  roleOptionInactive: {
    backgroundColor: '#FFFFFF',
    borderColor: '#E2E8F0',
  },
  roleOptionDisabled: {
    opacity: 0.4,
  },
  roleOptionText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#475569',
  },
  roleOptionTextActive: {
    color: '#FFFFFF',
  },
  selfNote: {
    fontSize: 10,
    color: '#CBD5E1',
    marginTop: 8,
    fontStyle: 'italic',
  },
});
