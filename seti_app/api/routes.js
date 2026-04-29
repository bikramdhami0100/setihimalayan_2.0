import api from './client';

export const getRoutes = (params) => api.get('/routes', { params });
export const searchRoutes = (origin, destination) => api.get('/routes/search', { params: { origin, destination } });
export const getRouteById = (id) => api.get(`/routes/${id}`);
export const createRoute = (data) => api.post('/routes', data);
export const updateRoute = (id, data) => api.put(`/routes/${id}`, data);
export const toggleRouteActive = (id, isActive) => api.patch(`/routes/${id}/toggle`, { is_active: isActive });
export const deleteRoute = (id) => api.delete(`/routes/${id}`);
export const getRouteStats = () => api.get('/routes/stats');
export const getPopularRoutes = () => api.get('/reports/popular-routes');
