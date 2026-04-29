import React, { createContext, useState, useContext, useCallback, useEffect } from 'react';
import * as busApi from '../api/buses';
import * as routeApi from '../api/routes';
import * as scheduleApi from '../api/schedules';
import * as bookingApi from '../api/bookings';
import { getProfile } from '../api/auth';
import { getAccessToken } from '../utils/storage';

const CustomerContext = createContext();

export function CustomerProvider({ children }) {
  // Data states
  const [buses, setBuses] = useState([]);
  const [routes, setRoutes] = useState([]);
  const [schedules, setSchedules] = useState([]);
  const [myBookings, setMyBookings] = useState([]);
  const [userProfile, setUserProfile] = useState(null);
  const [popularRoutes, setPopularRoutes] = useState([]);

  // UI states
  const [loading, setLoading] = useState({});
  const [refreshing, setRefreshing] = useState({});

  // Unified search & pagination
  const [searchQueries, setSearchQueries] = useState({});
  const [paginations, setPaginations] = useState({});

  // ── Helper: Get/Set Pagination ─────────────────────────────────────────
  const getPagination = (key) => paginations[key] || { page: 0, limit: 10, total: 0 };
  const updatePagination = (key, updates) => {
    setPaginations((prev) => ({
      ...prev,
      [key]: { ...(prev[key] || { page: 0, limit: 10, total: 0 }), ...updates },
    }));
  };


  // ── Helper: Get/Set Search Query ───────────────────────────────────────
  const getSearchQuery = (key) => searchQueries[key] || '';
  const updateSearchQuery = (key, query) => {
    setSearchQueries((prev) => ({ ...prev, [key]: query }));
    updatePagination(key, { page: 0 }); // reset page on new search
  };

  // ── Loading Helpers ────────────────────────────────────────────────────
  const setKeyLoading = (key, val) => setLoading((prev) => ({ ...prev, [key]: val }));
  const setKeyRefreshing = (key, val) => setRefreshing((prev) => ({ ...prev, [key]: val }));

  // ── Fetch Functions ────────────────────────────────────────────────────
  // Add these to your existing CustomerContext

const fetchPopularRoutes = useCallback(async () => {
  const key = 'popularRoutes';
  setKeyLoading(key, true);
  try {
    // Adjust the API call to match your backend endpoint (e.g., /api/routes/popular)
    const res = await routeApi.getPopularRoutes(); 
    setPopularRoutes(res.data.data.routes || []);
  } catch (err) {
    console.error("Failed to fetch popular routes", err);
  } finally {
    setKeyLoading(key, false);
  }
}, []);

// Also expose fetchRoutes with pagination parameters (already present, but ensure it accepts options)
// Modify your existing fetchRoutes to accept optional params like { limit }
// const fetchRoutes = useCallback(async (options = {}) => {
//   const key = 'routes';
//   setKeyLoading(key, true);
//   try {
//     const { page = 1, limit = 10, search = '' } = options;
//     const res = await routeApi.getRoutes({ page, limit, search });
//     setRoutes(res.data.data.routes || []);
//     updatePagination(key, { total: res.data.data.pagination?.total || 0 });
//   } finally {
//     setKeyLoading(key, false);
//   }
// }, []);

  const fetchBuses = useCallback(
    async (isRefreshing = false) => {
      const key = 'buses';
      isRefreshing ? setKeyRefreshing(key, true) : setKeyLoading(key, true);
      try {
        const { page, limit } = getPagination(key);
        const search = getSearchQuery(key);
        const res = await busApi.getBuses({ page: page + 1, limit, search });
        setBuses(res.data.data.buses || []);
        updatePagination(key, { total: res.data.data.pagination?.total || 0 });
      } finally {
        setKeyLoading(key, false);
        setKeyRefreshing(key, false);
      }
    },
    [paginations.buses, searchQueries.buses]
  );

  const fetchRoutes = useCallback(
    async (isRefreshing = false) => {
      const key = 'routes';
      isRefreshing ? setKeyRefreshing(key, true) : setKeyLoading(key, true);
      try {
        const { page, limit } = getPagination(key);
        const search = getSearchQuery(key);
        const res = await routeApi.getRoutes({ page: page + 1, limit, search });
        setRoutes(res.data.data.routes || []);
        updatePagination(key, { total: res.data.data.pagination?.total || 0 });
      } catch (err) {
        console.error("Failed to fetch routes", err);
      } finally {
        setKeyLoading(key, false);
        setKeyRefreshing(key, false);
      }
    },
    [paginations.routes, searchQueries.routes]
  );

  const fetchSchedules = useCallback(
    async (isRefreshing = false) => {
      const key = 'schedules';
      isRefreshing ? setKeyRefreshing(key, true) : setKeyLoading(key, true);
      try {
        const { page, limit } = getPagination(key);
        const search = getSearchQuery(key);
        const res = await scheduleApi.getSchedules({ page: page + 1, limit, search });
        setSchedules(res.data.data.schedules || []);
        updatePagination(key, { total: res.data.data.pagination?.total || 0 });
      } finally {
        setKeyLoading(key, false);
        setKeyRefreshing(key, false);
      }
    },
    [paginations.schedules, searchQueries.schedules]
  );

  const fetchMyBookings = useCallback(
    async (isRefreshing = false) => {
      const key = 'myBookings';
      isRefreshing ? setKeyRefreshing(key, true) : setKeyLoading(key, true);
      try {
        const { page, limit } = getPagination(key);
        const search = getSearchQuery(key);
        const token = await getAccessToken();
        const res = await bookingApi.getUserBookings(token, { page: page + 1, limit, search });
        setMyBookings(res.data.data.bookings || []);
        updatePagination(key, { total: res.data.data.pagination?.total || 0 });
      } finally {
        setKeyLoading(key, false);
        setKeyRefreshing(key, false);
      }
    },
    [paginations.myBookings, searchQueries.myBookings]
  );

  const fetchProfile = useCallback(async () => {
    const key = 'profile';
    setKeyLoading(key, true);
    try {
      const token = await getAccessToken();
      const res = await getProfile(token);
      setUserProfile(res.data.data.user);
    } finally {
      setKeyLoading(key, false);
    }
  }, []);

  // ── Actions (Bookings) ─────────────────────────────────────────────────
  const createBooking = useCallback(async (bookingData) => {
    const key = 'createBooking';
    setKeyLoading(key, true);
    try {
      const token = await getAccessToken();
      const res = await bookingApi.createBooking(token, bookingData);
      await fetchMyBookings(); // refresh list
      return res.data;
    } finally {
      setKeyLoading(key, false);
    }
  }, [fetchMyBookings]);

  const cancelBooking = useCallback(async (bookingId) => {
    const key = 'cancelBooking';
    setKeyLoading(key, true);
    try {
      const token = await getAccessToken();
      const res = await bookingApi.cancelBooking(token, bookingId);
      await fetchMyBookings(); // refresh list
      return res.data;
    } finally {
      setKeyLoading(key, false);
    }
  }, [fetchMyBookings]);

  // ── Initial Data Fetch ─────────────────────────────────────────────────
  useEffect(() => {
    fetchBuses();
    fetchRoutes();
    fetchSchedules();
    fetchMyBookings();
    fetchProfile();
    fetchPopularRoutes();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Context Value ──────────────────────────────────────────────────────
  const value = {
    // Data
    buses,
    routes,
    schedules,
    myBookings,
    userProfile,
    // Status
    loading,
    popularRoutes,
    refreshing,
    // Search & Pagination
    getPagination,
    updatePagination,
    getSearchQuery,
    updateSearchQuery,
    // Fetch actions
    fetchBuses,
    fetchRoutes,
    fetchSchedules,
    fetchMyBookings,
    fetchProfile,
    fetchPopularRoutes,
    // Business actions
    createBooking,
    cancelBooking,

    
  };

  return <CustomerContext.Provider value={value}>{children}</CustomerContext.Provider>;
}

export const useCustomerData = () => {
  const context = useContext(CustomerContext);
  if (!context) {
    throw new Error('useCustomerData must be used within a CustomerProvider');
  }
  return context;
};