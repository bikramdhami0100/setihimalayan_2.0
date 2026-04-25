import api from './client';

export const register = (userData) => api.post('/auth/register', userData);
export const login = (email, password) => api.post('/auth/login', { email, password });
export const refreshToken = (refreshToken) => api.post('/auth/refresh-token', { refreshToken });
export const getProfile = () => api.get('/auth/profile');
export const updateProfile = (data) => api.put('/auth/profile', data);
export const changePassword = (data) => api.post('/auth/change-password', data, {
  headers: { 'Authorization': `Bearer ${data.token}` }
});
export const logout = () => api.post('/auth/logout');
export const uploadProfileImage = (formData) => api.post('/auth/upload-profile-image', formData, {
  headers: { 'Content-Type': 'multipart/form-data' },
});
export const getUsers = () => api.get('/users');
export const deleteUser = (id) => api.delete(`/users/${id}`);
// reset password api calls
export const resetPassword = (email) => api.post('/auth/reset-password', { email });
// export const forgotPassword = (email) => api.post('/auth/forgot-password', { email });

