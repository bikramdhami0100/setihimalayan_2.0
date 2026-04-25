import React, { useState, useEffect } from "react";
import { View, Text, ScrollView, TouchableOpacity, Image, SafeAreaView, ActivityIndicator, RefreshControl } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { getAdminDashboard, getPopularRoutes } from "../../api/reports";
import { getBuses } from "../../api/buses";
import { getRoutes } from "../../api/routes";

export default function Dashboard() {
  const [activeTab, setActiveTab] = useState("Buses");
  const [revenueTimeframe, setRevenueTimeframe] = useState("30 Days");
  const [isLoading, setIsLoading] = useState(true);
  const [dashboardData, setDashboardData] = useState(null);
  const [popularRoutesData, setPopularRoutesData] = useState([]);
  const [buses, setBuses] = useState([]);
  const [routes, setRoutes] = useState([]);
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = async () => {
    try {
      const [dashRes, routesRes, busesRes, popularRes] = await Promise.all([
        getAdminDashboard(),
        getRoutes({ limit: 5 }),
        getBuses({ limit: 5 }),
        getPopularRoutes()
      ]);

      setDashboardData(dashRes.data.data);
      setRoutes(routesRes.data.data);
      setBuses(busesRes.data.data);
      setPopularRoutesData(popularRes.data.data);
    } catch (err) {
      console.error("Dashboard data fetch error:", err);
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    fetchData();
  };

  if (isLoading) {
    return (
      <SafeAreaView className="flex-1 bg-[#f8fafc] justify-center items-center">
        <ActivityIndicator size="large" color="#1e3a8a" />
      </SafeAreaView>
    );
  }

  const statsData = [
    { id: 1, title: "TOTAL REVENUE", value: `रु ${dashboardData?.total_revenue?.toLocaleString() || '0'}`, icon: "cash-outline", iconBg: "bg-blue-100", iconColor: "#3b82f6", trend: "+ 12%", trendBg: "bg-orange-50", trendColor: "text-orange-500" },
    { id: 2, title: "TOTAL BOOKINGS", value: dashboardData?.total_bookings || '0', icon: "ticket-outline", iconBg: "bg-indigo-100", iconColor: "#6366f1", trend: "+ 8.4%", trendBg: "bg-orange-50", trendColor: "text-orange-500" },
    { id: 3, title: "ACTIVE USERS", value: dashboardData?.active_users || '0', icon: "person-outline", iconBg: "bg-cyan-100", iconColor: "#06b6d4", trend: "- 2%", trendBg: "bg-red-50", trendColor: "text-red-500" },
    { id: 4, title: "TOTAL BUSES", value: dashboardData?.total_buses || '0', icon: "bus-outline", iconBg: "bg-amber-100", iconColor: "#d97706", trend: "Stable", trendBg: "bg-orange-50", trendColor: "text-orange-500" },
  ];

  return (
    <SafeAreaView className="flex-1 bg-[#f8fafc]">
      <ScrollView 
        className="flex-1 p-4" 
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        
        {/* Stats Grid */}
        <View className="flex-row flex-wrap justify-between">
          {statsData.map((stat) => (
            <View key={stat.id} className="bg-white rounded-2xl p-4 mb-4 w-[48%] shadow-sm border border-gray-100">
              <View className="flex-row justify-between items-start mb-3">
                <View className={`w-10 h-10 rounded-xl items-center justify-center ${stat.iconBg}`}>
                  <Ionicons name={stat.icon} size={20} color={stat.iconColor} />
                </View>
                <View className={`${stat.trendBg} px-2 py-1 rounded-md flex-row items-center`}>
                  {stat.trend.includes('Stable') ? (
                    <Ionicons name="checkmark-circle" size={10} color="#f97316" className="mr-1" />
                  ) : (
                    <Ionicons name={stat.trend.includes('+') ? "trending-up" : "trending-down"} size={10} color={stat.trend.includes('+') ? "#f97316" : "#ef4444"} className="mr-1" />
                  )}
                  <Text className={`text-[10px] font-bold ${stat.trendColor}`}>{stat.trend}</Text>
                </View>
              </View>
              <Text className="text-gray-400 text-[10px] font-bold tracking-wider mb-1">{stat.title}</Text>
              <Text className="text-[#1d3557] text-xl font-bold">{stat.value}</Text>
            </View>
          ))}
        </View>

        {/* Revenue Trends */}
        <View className="bg-white rounded-3xl p-5 mb-4 shadow-sm border border-gray-100">
          <View className="flex-row justify-between items-center mb-8">
            <Text className="text-[#1d3557] text-lg font-bold">Revenue Trends</Text>
            <View className="flex-row bg-gray-100 rounded-full p-1">
              <TouchableOpacity 
                className={`px-3 py-1 rounded-full ${revenueTimeframe === '7 Days' ? 'bg-white shadow-sm' : ''}`}
                onPress={() => setRevenueTimeframe('7 Days')}
              >
                <Text className={`text-xs font-semibold ${revenueTimeframe === '7 Days' ? 'text-gray-800' : 'text-gray-500'}`}>7 Days</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                className={`px-3 py-1 rounded-full ${revenueTimeframe === '30 Days' ? 'bg-[#0f172a] shadow-sm' : ''}`}
                onPress={() => setRevenueTimeframe('30 Days')}
              >
                <Text className={`text-xs font-semibold ${revenueTimeframe === '30 Days' ? 'text-white' : 'text-gray-500'}`}>30 Days</Text>
              </TouchableOpacity>
            </View>
          </View>
          
          {/* Mock Bar Chart */}
          <View className="flex-row justify-between items-end h-48 px-2 pb-6 relative">
            {[45, 65, 55, 85, 100, 70, 50].map((height, i) => (
              <View key={i} className="items-center w-8">
                {i === 4 && (
                  <View className="absolute -top-8 bg-[#0f172a] px-2 py-1 rounded">
                    <Text className="text-white text-[10px] font-bold">₹680k</Text>
                  </View>
                )}
                <View 
                  className={`w-4 rounded-t-lg ${i === 4 ? 'bg-[#0f172a]' : 'bg-[#eff6ff]'}`}
                  style={{ height: `${height}%` }}
                />
                <Text className="text-gray-400 text-[10px] absolute -bottom-5">Wk {i+1}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Popular Routes */}
        <View className="bg-white rounded-3xl p-5 mb-4 shadow-sm border border-gray-100">
          <Text className="text-[#1d3557] text-base font-semibold mb-5">Popular Routes</Text>
          
          {popularRoutesData.map((route, idx) => (
            <View key={idx} className="mb-4">
              <View className="flex-row justify-between mb-2">
                <Text className="text-gray-800 text-xs font-medium">{route.origin} → {route.destination}</Text>
                <Text className="text-gray-800 text-xs font-medium">{route.percentage}%</Text>
              </View>
              <View className="h-1.5 w-full bg-gray-100 rounded-full overflow-hidden flex-row">
                <View 
                  className={`${route.percentage > 65 ? 'bg-[#1e3a8a]' : (route.percentage > 40 ? 'bg-[#38bdf8]' : 'bg-gray-500')} rounded-full`}
                  style={{ width: `${route.percentage}%` }}
                />
              </View>
            </View>
          ))}
          
          <TouchableOpacity className="mt-4 py-3 border border-gray-200 rounded-xl items-center">
            <Text className="text-[#457b9d] font-semibold text-sm">View All Analytics</Text>
          </TouchableOpacity>
        </View>

        {/* Dynamic Tabs Section: Buses / Routes / Schedules */}
        <View className="bg-white rounded-3xl mb-6 shadow-sm overflow-hidden border border-gray-100">
          <View className="flex-row border-b border-gray-100 px-2 pt-2">
            {['Buses', 'Routes', 'Schedules'].map(tab => (
              <TouchableOpacity 
                key={tab}
                className={`px-4 py-3 border-b-2 ${activeTab === tab ? 'border-[#1e3a8a]' : 'border-transparent'}`}
                onPress={() => setActiveTab(tab)}
              >
                <Text className={`font-semibold text-sm ${activeTab === tab ? 'text-[#1e3a8a]' : 'text-gray-400'}`}>
                  {tab}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {activeTab === 'Buses' && (
            <View>
              <View className="bg-[#f8fafc] flex-row px-5 py-3 border-b border-gray-100">
                <Text className="flex-1 text-gray-500 text-[10px] font-bold tracking-wider">Bus Number</Text>
                <Text className="flex-1 text-gray-500 text-[10px] font-bold tracking-wider text-center">Operator</Text>
                <Text className="flex-[0.8] text-gray-500 text-[10px] font-bold tracking-wider text-right">Type</Text>
              </View>
              {buses.map((bus) => (
                <View key={bus._id} className="flex-row px-5 py-4 border-b border-gray-100 items-center">
                  <View className="flex-1">
                    <Text className="text-[#1e3a8a] font-bold text-xs">{bus.bus_number}</Text>
                  </View>
                  <View className="flex-1 flex-row items-center justify-center">
                    <Text className="text-gray-800 text-xs mr-1 text-center leading-tight">{bus.operator_name}</Text>
                    {bus.is_active && <View className="w-1.5 h-1.5 bg-[#38bdf8] rounded-full" />}
                  </View>
                  <View className="flex-[0.8] items-end">
                    <Text className="text-gray-400 text-[10px] text-right leading-tight uppercase">{bus.bus_type}</Text>
                  </View>
                </View>
              ))}
            </View>
          )}

          {activeTab === 'Routes' && (
            <View>
              <View className="bg-[#f8fafc] flex-row px-5 py-3 border-b border-gray-100">
                <Text className="flex-1 text-gray-500 text-[10px] font-bold tracking-wider">Route</Text>
                <Text className="flex-1 text-gray-500 text-[10px] font-bold tracking-wider text-right">Distance</Text>
              </View>
              {routes.map((r) => (
                <View key={r._id} className="flex-row px-5 py-4 border-b border-gray-100 items-center">
                  <Text className="flex-1 text-[#1e3a8a] font-bold text-xs">{r.origin} - {r.destination}</Text>
                  <Text className="flex-1 text-gray-800 text-xs text-right">{r.distance} km</Text>
                </View>
              ))}
            </View>
          )}

          {activeTab === 'Schedules' && (
            <View>
              <View className="bg-[#f8fafc] flex-row px-5 py-3 border-b border-gray-100">
                <Text className="flex-1 text-gray-500 text-[10px] font-bold tracking-wider">Route</Text>
                <Text className="flex-1 text-gray-500 text-[10px] font-bold tracking-wider text-center">Time</Text>
                <Text className="flex-1 text-gray-500 text-[10px] font-bold tracking-wider text-right">Status</Text>
              </View>
              {/* Note: Schedules could be fetched similarly if needed */}
              <View className="p-4 items-center">
                 <Text className="text-gray-400 text-xs">Schedules data integration in progress</Text>
              </View>
            </View>
          )}

          <TouchableOpacity className="py-4 items-center bg-white">
            <Text className="text-[#1e3a8a] text-sm font-semibold">Download Report as CSV</Text>
          </TouchableOpacity>
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}
