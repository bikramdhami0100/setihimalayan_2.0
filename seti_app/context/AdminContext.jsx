import React, { createContext, useState, useContext, useCallback, useEffect } from 'react';
import * as busApi from '../api/buses';
import * as bookingApi from '../api/bookings';
import * as routeApi from '../api/routes';
import * as scheduleApi from '../api/schedules';
import * as reportApi from '../api/reports';
import { getProfile } from '../api/auth'; // For user data if needed or a dedicated user API
import { getAccessToken } from '../utils/storage';
import * as usersApi from '../api/users'; // Assuming you have a users API module for admin user management

const AdminContext = createContext();

export function AdminProvider({ children }) {
  // Data States
  const [buses, setBuses] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [routes, setRoutes] = useState([]);
  const [schedules, setSchedules] = useState([]);
  const [reports, setReports] = useState([]);
  const [dashboard, setDashboard] = useState(null);
  const [users, setUsers] = useState([]);

  // UI States
  const [loading, setLoading] = useState({});
  const [refreshing, setRefreshing] = useState({});

  // Unified Search & Pagination (Replaces SearchContext and PaginationContext)
  const [searchQueries, setSearchQueries] = useState({});
  const [paginations, setPaginations] = useState({});

  // ── Helper: Get/Set Pagination for a specific key
  const getPagination = (key) => paginations[key] || { page: 0, limit: 10, total: 0 };
  const updatePagination = (key, updates) => {
    setPaginations(prev => ({
      ...prev,
      [key]: { ...(prev[key] || { page: 0, limit: 10, total: 0 }), ...updates }
    }));
  };

  // ── Helper: Get/Set Search Query for a specific key
  const getSearchQuery = (key) => searchQueries[key] || "";
  const updateSearchQuery = (key, query) => {
    setSearchQueries(prev => ({ ...prev, [key]: query }));
    updatePagination(key, { page: 0 }); // Reset page on search change
  };

  // ── Loading Helpers
  const setKeyLoading = (key, val) => setLoading(prev => ({ ...prev, [key]: val }));
  const setKeyRefreshing = (key, val) => setRefreshing(prev => ({ ...prev, [key]: val }));

  // ── ACTIONS ────────────────────────────────────────────────────────────
const fetchUsers = useCallback(async (isRefreshing = false) => {
  const key = 'users';
  isRefreshing ? setKeyRefreshing(key, true) : setKeyLoading(key, true);
  try {
    const { page, limit } = getPagination(key);
    const search = getSearchQuery(key);
    const res = await usersApi.getUsers({ page: page + 1, limit, search });
    setUsers(res.data.data.users || []);
    updatePagination(key, { total: res.data.data.pagination?.total || 0 });
  } catch (err) {
    console.error("Failed to fetch users", err);
  }
   finally {
    setKeyLoading(key, false);
    setKeyRefreshing(key, false);
  }
}, [paginations.users, searchQueries.users]);

  const fetchBuses = useCallback(async (isRefreshing = false) => {
    const key = 'buses';
    isRefreshing ? setKeyRefreshing(key, true) : setKeyLoading(key, true);
    try {
      const { page, limit } = getPagination(key);
      const search = getSearchQuery(key);
      const res = await busApi.getBuses({ page: page + 1, limit, search });
      // // console.log(res,"buses")
      setBuses(res.data.data.buses || []);
      updatePagination(key, { total: res.data.data.pagination?.total || 0 });
    }catch (err) {
      console.error("Failed to fetch buses", err);
    } finally {
      setKeyLoading(key, false);
      setKeyRefreshing(key, false);
    }
  }, [paginations.buses, searchQueries.buses]);

  const fetchBookings = useCallback(async (isRefreshing = false) => {
    const key = 'bookings';
    isRefreshing ? setKeyRefreshing(key, true) : setKeyLoading(key, true);
    try {
      const { page, limit } = getPagination(key);
      const search = getSearchQuery(key);
      // get from async storage or native storage if not available in memory, this is just a placeholder
      // const tokens = await AsyncStorage.getItem('refresh_token_hash'); // Example for React Native
      // getAccessToken() // Example for native storage utility function
      let tokensValue = await getAccessToken(); // Fallback to async storage if not in memory
      // // console.log(tokensValue,"token value")
      const res = await bookingApi.getAllBookings(tokensValue,{ page: page + 1, limit, search });
      setBookings(res.data.data.bookings || []);
      updatePagination(key, { total: res.data.data.pagination?.total || 0 });
    } catch (err) {
      console.error("Failed to fetch bookings", err); 
    } finally {
      setKeyLoading(key, false);
      setKeyRefreshing(key, false);
    }
  }, [paginations.bookings, searchQueries.bookings]);


const fetchRoutes = useCallback(async (isRefreshing = false) => {
  const key = 'routes';
  isRefreshing ? setKeyRefreshing(key, true) : setKeyLoading(key, true);
  try {
    const { page, limit } = getPagination(key);
    const search = getSearchQuery(key);
    const res = await routeApi.getRoutes({ page: page + 1, limit, search }); // <-- pass search
    setRoutes(res.data.data.routes || []);
    updatePagination(key, { total: res.data.data.pagination?.total || 0 });
  } finally {
    setKeyLoading(key, false);
    setKeyRefreshing(key, false);
  }
}, [paginations.routes, searchQueries.routes]);

  const fetchDashboard = useCallback(async () => {
    const key = 'dashboard';
    setKeyLoading(key, true);
    try {
      const res = await reportApi.getUtilizationReport();
      setDashboard(res.data.data);
    } catch (err) {
      console.error("Failed to fetch dashboard data", err);
    } finally {
      setKeyLoading(key, false);
    }
  }, []);
  // Inside AdminProvider, after fetchRoutes definition:
const fetchSchedules = useCallback(async (isRefreshing = false) => {
  const key = 'schedules';
  isRefreshing ? setKeyRefreshing(key, true) : setKeyLoading(key, true);
  try {
    const { page, limit } = getPagination(key);
    const search = getSearchQuery(key);
    const res = await scheduleApi.getSchedules({ page: page + 1, limit, search });
    setSchedules(res.data.data.schedules || []);
    updatePagination(key, { total: res.data.data.pagination?.total || 0 });
  } catch (err) {
    console.error("Failed to fetch schedules", err);
  } finally {
    setKeyLoading(key, false);
    setKeyRefreshing(key, false);
  }
}, [paginations.schedules, searchQueries.schedules]);
    //   Initial data fetch can be triggered here  i.e. fetchDashboard() or fetchBuses() etc. or can be triggered in respective screens
 useEffect(() => {
    fetchDashboard();
    fetchBuses();
    fetchBookings();
    fetchRoutes();
    fetchSchedules();
    fetchUsers();
  } , []);
  // ── Combined Context Object
  const value = {
    // Data
    buses, 
    bookings,
     routes, 
     schedules,
      reports, 
      dashboard, 
      users,
      fetchUsers,
       fetchSchedules, 
    // Status
    loading, refreshing,
    // Search & Pagination
    getPagination, updatePagination,
    getSearchQuery, updateSearchQuery,
    // Actions
    fetchBuses, fetchBookings, fetchRoutes, fetchDashboard
  };

  return (
    <AdminContext.Provider value={value}>
      {children}
    </AdminContext.Provider>
  );
}

export const useAdminData = () => {
  const context = useContext(AdminContext);
  if (!context) throw new Error("useAdminData must be used within AdminProvider");
  return context;
};
