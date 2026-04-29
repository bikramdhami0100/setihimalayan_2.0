import api from './client'; // your Axios instance

export const getUsers = (params) => api.get('/users', { params });

export const getUserById = (id) => api.get(`/users/${id}`);

// For create/update – if formData has a 'profile_image' file, send as FormData
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

export const deleteUser = (id) => api.delete(`/users/${id}`);