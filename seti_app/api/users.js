import api from './client';

export const getUsers = (params) => api.get('/users', { params });

export const getUserById = (id) => api.get(`/users/${id}`);

export const getAllUsersForExport = (params) => api.get('/users', { params: { ...params, page: undefined, limit: undefined } });

export const createUser = (data) => {
  if (data instanceof FormData) {
    return api.post('/users', data, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  }
  return api.post('/users', data);
};

export const updateUser = (id, data) => {
  if (data instanceof FormData) {
    return api.put(`/users/${id}`, data, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  }
  return api.put(`/users/${id}`, data);
};

export const updateUserStatus = (id, status) => api.patch(`/users/${id}/status`, { status });

export const deleteUser = (id) => api.delete(`/users/${id}`);