import api from './client';

export const initiateBooking = (data) => api.post('/bookings/initiate', data);
export const confirmBooking = (bookingId) => api.post(`/bookings/${bookingId}/confirm`);
export const getUserBookings = (page = 1, limit = 10, search = '') =>api.get('/bookings/my-bookings', { params: { page, limit, search } });
export const getBookingByReference = (reference) => api.get(`/bookings/reference/${reference}`);
export const cancelBooking = (reference, reason) => api.post(`/bookings/${reference}/cancel`, { cancellation_reason: reason });
// export const downloadTicket = (reference) => api.get(`/bookings/${reference}/ticket`, { responseType: 'blob' });
export const getAllBookings = (params) => api.get('/bookings', { params });
export const createBooking = (data) => api.post('/bookings', data);
export const updateBooking = (id, data) => api.put(`/bookings/${id}`, data);
export const deleteBooking = (id) => api.delete(`/bookings/${id}`);
export const getBookingById = (id) => api.get(`/bookings/${id}`);
export const downloadTicket = (reference) => api.get(`/bookings/${reference}/ticket`, { responseType: 'blob' });