import React, { createContext, useState, useContext, useCallback, useEffect } from 'react';
import * as busApi from '../api/buses';
import * as bookingApi from '../api/bookings';
import * as routeApi from '../api/routes';
import * as scheduleApi from '../api/schedules';
import * as reportApi from '../api/reports';
import { getProfile } from '../api/auth';
import * as usersApi from '../api/users';
import { AuthContext } from './AuthContext';

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

  // ── Helper: Get/Set Pagination for a specific key (1-indexed)
  const getPagination = (key) => paginations[key] || { page: 1, limit: 10, total: 0 };
  const updatePagination = (key, updates) => {
    setPaginations(prev => ({
      ...prev,
      [key]: { ...(prev[key] || { page: 1, limit: 10, total: 0 }), ...updates }
    }));
  };

  // ── Helper: Get/Set Search Query for a specific key
  const getSearchQuery = (key) => searchQueries[key] || "";
  const updateSearchQuery = (key, query) => {
    setSearchQueries(prev => ({ ...prev, [key]: query }));
    updatePagination(key, { page: 1 }); // Reset page on search change
  };

  // ── Sorting state
  const [sortConfig, setSortConfig] = useState({});
  const getSort = (key) => sortConfig[key] || { sortBy: 'created_at', sortOrder: 'DESC' };
  const updateSort = (key, sortBy, sortOrder) => {
    setSortConfig(prev => ({ ...prev, [key]: { sortBy, sortOrder } }));
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
    const { sortBy, sortOrder } = getSort(key);
    const res = await usersApi.getUsers({ page, limit, search, sortBy, sortOrder });
    setUsers(res.data.data.users || []);
    updatePagination(key, { total: res.data.data.pagination?.total || 0, page: res.data.data.pagination?.page || page });
  } catch (err) {
    console.error("Failed to fetch users", err);
  }
   finally {
    setKeyLoading(key, false);
    setKeyRefreshing(key, false);
  }
}, [paginations.users, searchQueries.users, sortConfig.users]);

  const fetchBuses = useCallback(async (isRefreshing = false) => {
    const key = 'buses';
    isRefreshing ? setKeyRefreshing(key, true) : setKeyLoading(key, true);
    try {
      const { page, limit } = getPagination(key);
      const search = getSearchQuery(key);
      const { sortBy, sortOrder } = getSort(key);
      const res = await busApi.getBuses({ page, limit, search, sortBy, sortOrder });
      setBuses(res.data.data.buses || []);
      updatePagination(key, { total: res.data.data.pagination?.total || 0, page: res.data.data.pagination?.page || page });
    }catch (err) {
      console.error("Failed to fetch buses", err);
    } finally {
      setKeyLoading(key, false);
      setKeyRefreshing(key, false);
    }
  }, [paginations.buses, searchQueries.buses, sortConfig.buses]);

  const fetchBookings = useCallback(async (isRefreshing = false, extraParams = {}) => {
    const key = 'bookings';
    isRefreshing ? setKeyRefreshing(key, true) : setKeyLoading(key, true);
    try {
      const { page, limit } = getPagination(key);
      const search = getSearchQuery(key);
      const { sortBy, sortOrder } = getSort(key);
      const params = { page, limit, search, sortBy, sortOrder, ...extraParams };
      const res = await bookingApi.getAllBookings(params);
      setBookings(res.data.data.bookings || []);
      updatePagination(key, { total: res.data.data.pagination?.total || 0, page: res.data.data.pagination?.page || page });
    } catch (err) {
      console.error("Failed to fetch bookings", err); 
    } finally {
      setKeyLoading(key, false);
      setKeyRefreshing(key, false);
    }
  }, [paginations.bookings, searchQueries.bookings, sortConfig.bookings]);


const fetchRoutes = useCallback(async (isRefreshing = false) => {
  const key = 'routes';
  isRefreshing ? setKeyRefreshing(key, true) : setKeyLoading(key, true);
  try {
    const { page, limit } = getPagination(key);
    const search = getSearchQuery(key);
    const { sortBy, sortOrder } = getSort(key);
    const res = await routeApi.getRoutes({ page, limit, search, sortBy, sortOrder });
    setRoutes(res.data.data.routes || []);
    updatePagination(key, { total: res.data.data.pagination?.total || 0, page: res.data.data.pagination?.page || page });
  } catch (err) {
    console.error("Failed to fetch routes", err);
  } finally {
    setKeyLoading(key, false);
    setKeyRefreshing(key, false);
  }
}, [paginations.routes, searchQueries.routes, sortConfig.routes]);

  const fetchDashboard = useCallback(async () => {
    const key = 'dashboard';
    setKeyLoading(key, true);
    try {
      const res = await reportApi.getAdminDashboard();
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
    const { sortBy, sortOrder } = getSort(key);
    const res = await scheduleApi.getSchedules({ page, limit, search, sortBy, sortOrder });
    setSchedules(res.data.data.schedules || []);
    updatePagination(key, { total: res.data.data.pagination?.total || 0, page: res.data.data.pagination?.page || page });
  } catch (err) {
    console.error("Failed to fetch schedules", err);
  } finally {
    setKeyLoading(key, false);
    setKeyRefreshing(key, false);
  }
}, [paginations.schedules, searchQueries.schedules, sortConfig.schedules]);
  const { isAuthenticated, user } = useContext(AuthContext);

  useEffect(() => {
    if (!isAuthenticated || !user) return;
    const isAdmin = user.role === 'admin' || user.role === 'super_admin';
    if (!isAdmin) return;
    fetchDashboard();
    fetchBuses();
    fetchBookings();
    fetchRoutes();
    fetchSchedules();
    fetchUsers();
  }, [isAuthenticated, user]);
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
    // Sorting
    getSort, updateSort,
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
