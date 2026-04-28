import React, { useState, useEffect, useContext } from "react";
import {
  View,
  SafeAreaView,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
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

// Color mapping for role & status badges
const roleBadgeStyle = {
  [USER_ROLES.PASSENGER]: "bg-slate-100",
  [USER_ROLES.ADMIN]: "bg-blue-100",
  [USER_ROLES.SUPER_ADMIN]: "bg-violet-100",
};

const roleTextStyle = {
  [USER_ROLES.PASSENGER]: "text-slate-600",
  [USER_ROLES.ADMIN]: "text-blue-700",
  [USER_ROLES.SUPER_ADMIN]: "text-violet-700",
};

/** Simple avatar with initials */
const Avatar = ({ name }) => {
  const initials = name
    ? name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2)
    : "??";
  const colors = [
    "bg-blue-500", "bg-emerald-500", "bg-violet-500",
    "bg-amber-500", "bg-rose-500", "bg-cyan-500",
  ];
  const colorIndex = initials.length % colors.length;
  return (
    <View
      className={`w-11 h-11 rounded-full ${colors[colorIndex]} items-center justify-center`}
    >
      <Text className="text-white text-sm font-black">{initials}</Text>
    </View>
  );
};

/** Helper for status badge */
const StatusBadge = ({ status }) => {
  const isActive = status === "active";
  return (
    <View
      className={`px-2 py-0.5 rounded-full ${
        isActive ? "bg-green-100" : "bg-red-100"
      }`}
    >
      <Text
        className={`text-[9px] font-black uppercase ${
          isActive ? "text-green-700" : "text-red-700"
        }`}
      >
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
      // Assuming response structure: res.data.data.users
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
    const badgeBg = roleBadgeStyle[item.role] || "bg-slate-100";
    const badgeText = roleTextStyle[item.role] || "text-slate-600";
    const verified = item.is_email_verified;

    return (
      <View
        className=" mx-4 mb-4 p-4 rounded-3xl border border-slate-100"
        style={{
          shadowColor: "#0f172a",
          shadowOpacity: 0.04,
          shadowRadius: 12,
          shadowOffset: { width: 0, height: 4 },
          elevation: 2,
        }}
      >
        {/* Top row: Avatar, name, role badge */}
        <View className="flex-row items-start mb-3">
          <Avatar name={item.full_name} />
          <View className="flex-1 ml-3">
            <Text className="text-base font-black text-slate-800" numberOfLines={1}>
              {item.full_name}
            </Text>
            {/* Email & Phone */}
            <View className="flex-row items-center mt-0.5">
              <Ionicons name="mail-outline" size={12} color="#94a3b8" />
              <Text className="text-xs text-slate-500 ml-1 mr-2" numberOfLines={1}>
                {item.email}
              </Text>
            </View>
            {item.phone && (
              <View className="flex-row items-center mt-0.5">
                <Ionicons name="call-outline" size={12} color="#94a3b8" />
                <Text className="text-xs text-slate-500 ml-1">{item.phone}</Text>
              </View>
            )}
          </View>
          {/* Role & Status badges */}
          <View className="items-end">
            <View className={`px-3 py-1 rounded-full ${badgeBg}`}>
              <Text className={`text-[10px] font-black uppercase ${badgeText}`}>
                {item.role.replace("_", " ")}
              </Text>
            </View>
            <View className="mt-1">
              <StatusBadge status={item.status} />
            </View>
          </View>
        </View>

        {/* Email verification indicator */}
        <View className="flex-row items-center mb-3">
          <Ionicons
            name={verified ? "checkmark-circle" : "close-circle"}
            size={14}
            color={verified ? "#16a34a" : "#dc2626"}
          />
          <Text
            className={`text-xs font-bold ml-1 ${
              verified ? "text-green-600" : "text-red-600"
            }`}
          >
            {verified ? "Email verified" : "Email not verified"}
          </Text>
        </View>

        {/* Role assignment */}
        <Text className="text-xs font-bold text-slate-400 mb-2 uppercase tracking-wider">
          Change role
        </Text>
        <View className="flex-row flex-wrap gap-2">
          {ROLE_OPTIONS.map((roleOption) => {
            const active = item.role === roleOption;
            const disabled = savingId === item.id || active || isSelf;
            return (
              <TouchableOpacity
                key={`${item.id}-${roleOption}`}
                onPress={() => handleRoleUpdate(item.id, roleOption)}
                disabled={disabled}
                className={`flex-row items-center gap-1.5 px-4 py-2.5 rounded-2xl border ${
                  active
                    ? "bg-slate-900 border-slate-900"
                    : "bg-white border-slate-200"
                } ${disabled ? "opacity-40" : "opacity-100"}`}
              >
                {savingId === item.id && !active ? (
                  <ActivityIndicator size="small" color={active ? "#fff" : "#0f172a"} />
                ) : (
                  active && (
                    <Ionicons name="checkmark-circle" size={14} color="#fff" />
                  )
                )}
                <Text
                  className={`text-xs font-extrabold ${
                    active ? "text-white" : "text-slate-600"
                  }`}
                >
                  {roleOption.replace("_", " ")}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
        {isSelf && (
          <Text className="text-[10px] text-slate-300 mt-2 italic">
            You can't change your own role here.
          </Text>
        )}
      </View>
    );
  };

  return (
    <SafeAreaView className="flex-1 bg-slate-50">
      {/* Header */}
      <View className="px-4 pt-4 pb-2">
        <View className="flex-row items-center gap-2 mb-1">
          <Ionicons name="shield-checkmark" size={28} color="#1e3a8a" />
          <Text className="text-2xl font-black text-[#1e3a8a]">Role Management</Text>
        </View>
        <Text className="text-slate-400 text-xs font-medium ml-10 mb-4">
          Only super admins can update user roles.
        </Text>

        {/* Search bar */}
        <View
          className="flex-row items-center bg-white px-4 py-3 rounded-2xl border border-slate-200 mb-6 mx-0.5"
          style={{
            shadowColor: "#0f172a",
            shadowOpacity: 0.03,
            shadowRadius: 6,
            shadowOffset: { width: 0, height: 2 },
            elevation: 1,
          }}
        >
          <Ionicons name="search-outline" size={20} color="#94a3b8" />
          <TextInput
            style={{ flex: 1, backgroundColor: "transparent", marginLeft: 8 }}
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

      {/* User list */}
      {loading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#1e3a8a" />
          <Text className="mt-4 text-slate-400 font-bold">Loading users...</Text>
        </View>
      ) : (
        <FlatList
          data={filteredUsers}
          renderItem={renderItem}
          keyExtractor={(item) => item.id?.toString() ?? String(item.email)}
          contentContainerStyle={{ paddingBottom: 24 }}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View className="items-center mt-20">
              <Ionicons name="people-outline" size={64} color="#e2e8f0" />
              <Text className="text-slate-400 font-semibold mt-4">
                {search ? "No matching users" : "No users yet"}
              </Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}