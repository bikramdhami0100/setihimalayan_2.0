import api from './client';

export const searchSchedules = (origin, destination, date) =>
  api.get('/schedules/search', { params: { origin, destination, date } });

export const getSchedules = (params) => api.get('/schedules', { params });
export const getScheduleById = (id) => api.get(`/schedules/${id}`);
export const getSeatLayout = (id) => api.get(`/schedules/${id}/seats`);
export const createSchedule = (data) => api.post('/schedules', data);
export const updateSchedule = (id, data) => api.put(`/schedules/${id}`, data);
export const cancelSchedule = (id, reason) => api.post(`/schedules/${id}/cancel`, { cancellation_reason: reason });