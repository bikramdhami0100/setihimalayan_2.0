import api from './client';

export const getAdminDashboard = () => api.get('/reports/dashboard');
export const getDailyRevenue = (startDate, endDate) => api.get('/reports/daily-revenue', { params: { start_date: startDate, end_date: endDate } });
export const getPopularRoutes = () => api.get('/reports/popular-routes');
export const getBookingStats = (startDate, endDate) => api.get('/reports/booking-stats', { params: { start_date: startDate, end_date: endDate } });
export const getUtilizationReport = () => api.get('/reports/utilization');