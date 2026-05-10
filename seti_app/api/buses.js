import api from './client';

export const getBuses = (params) => api.get('/buses', { params });
export const getAllBusesForExport = (params) => api.get('/buses', { params: { ...params, page: undefined, limit: undefined } });
export const getBusById = (id) => api.get(`/buses/${id}`);
export const createBus = (data) => api.post('/buses', data);
export const updateBus = (id, data) => api.put(`/buses/${id}`, data);
export const updateBusStatus = (id, status) => api.patch(`/buses/${id}/status`, { status });
export const deleteBus = (id) => api.delete(`/buses/${id}`);