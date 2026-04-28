import React, { useState, useEffect } from "react";
import { View, Text, SafeAreaView, FlatList, TouchableOpacity, ActivityIndicator, Alert, TextInput } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { getUsers, deleteUser } from "../../api/auth";

export default function AdminUsers() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  const fetchUsers = async () => {
    try {
      const res = await getUsers();
      setUsers(res.data.data);
    } catch (err) {
      Alert.alert("Error", "Failed to fetch users");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleDelete = async(id) => {
    Alert.alert("Delete User", "Are you sure you want to remove this user?", [
      { text: "Cancel" },
      { text: "Delete", style: "destructive", onPress: async () => {
        try {
          await deleteUser(id);
          fetchUsers();
          Alert.alert("Success", "User removed");
        } catch (err) {
          Alert.alert("Error", "Failed to delete user");
        }
      }}
    ]);
  };

  const filteredUsers = users.filter(u => 
    u.full_name?.toLowerCase().includes(search.toLowerCase()) ||
    u.email?.toLowerCase().includes(search.toLowerCase())
  );

  const renderItem = ({ item }) => (
    <View className="bg-white p-5 rounded-3xl mb-4 shadow-sm border border-gray-100 flex-row items-center">
      <View className="w-12 h-12 bg-slate-800 rounded-2xl items-center justify-center mr-4">
        <Text className="text-white font-black text-lg">{item.full_name?.charAt(0) || 'U'}</Text>
      </View>
      <View className="flex-1">
        <Text className="text-[#1e3a8a] font-black text-base">{item.full_name}</Text>
        <Text className="text-gray-400 text-xs font-medium">{item.email}</Text>
        <View className="flex-row items-center mt-2">
           <View className={`px-2 py-0.5 rounded-md ${item.role === 'super_admin' ? 'bg-emerald-100' : item.role === 'admin' ? 'bg-orange-100' : 'bg-blue-100'}`}>
              <Text className={`text-[8px] font-black uppercase ${item.role === 'super_admin' ? 'text-emerald-700' : item.role === 'admin' ? 'text-orange-600' : 'text-blue-600'}`}>
                {item.role}
              </Text>
           </View>
           {item.phone && (
             <>
               <View className="w-1 h-1 rounded-full bg-gray-200 mx-2" />
               <Text className="text-gray-400 text-[10px] font-medium">{item.phone}</Text>
             </>
           )}
        </View>
      </View>
      {item.role !== 'admin' && (
        <TouchableOpacity onPress={() => handleDelete(item.id)} className="p-2">
          <Ionicons name="trash-outline" size={20} color="#ef4444" />
        </TouchableOpacity>
      )}
    </View>
  );

  return (
    <SafeAreaView className="flex-1 bg-[#f8fafc]">
      <View className="flex-1 p-4">
        <View className="mb-6">
          <Text className="text-2xl font-black text-[#1e3a8a] mb-1">User Management</Text>
          <Text className="text-gray-500 text-xs font-medium">Manage passenger and admin accounts</Text>
        </View>

        <View className="flex-row items-center bg-white px-4 py-3 rounded-2xl shadow-sm border border-gray-100 mb-6">
          <Ionicons name="search-outline" size={20} color="#94a3b8" />
          <TextInput 
            className="flex-1 ml-3 text-sm font-semibold text-gray-700"
            placeholder="Search Name or Email..."
            placeholderTextColor="#94a3b8"
            value={search}
            onChangeText={setSearch}
          />
        </View>

        {loading ? (
          <ActivityIndicator size="large" color="#1e3a8a" className="mt-10" />
        ) : (
          <FlatList
            data={filteredUsers}
            renderItem={renderItem}
            keyExtractor={item => item.id?.toString() ?? item._id?.toString()}
            showsVerticalScrollIndicator={false}
            ListEmptyComponent={<Text className="text-gray-400 text-center mt-10">No users found</Text>}
          />
        )}
      </View>
    </SafeAreaView>
  );
}
