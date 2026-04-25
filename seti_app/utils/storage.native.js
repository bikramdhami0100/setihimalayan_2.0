import * as SecureStore from 'expo-secure-store';
import { STORAGE_KEYS } from './constants';

/**
 * Save a string value securely
 */
export const setItem = async (key, value) => {
  try {
    await SecureStore.setItemAsync(key, value);
  } catch (error) {
    console.error(`Error saving ${key}:`, error);
  }
};

/**
 * Retrieve a string value securely
 */
export const getItem = async (key) => {
  try {
    return await SecureStore.getItemAsync(key);
  } catch (error) {
    console.error(`Error retrieving ${key}:`, error);
    return null;
  }
};

/**
 * Delete an item securely
 */
export const deleteItem = async (key) => {
  try {
    await SecureStore.deleteItemAsync(key);
  } catch (error) {
    console.error(`Error deleting ${key}:`, error);
  }
};

export const setObject = async (key, value) => {
  await setItem(key, JSON.stringify(value));
};

export const getObject = async (key) => {
  const data = await getItem(key);
  if (data) {
    try {
      return JSON.parse(data);
    } catch {
      return null;
    }
  }
  return null;
};

export const setAccessToken = (token) => setItem(STORAGE_KEYS.ACCESS_TOKEN, token);
export const getAccessToken = () => getItem(STORAGE_KEYS.ACCESS_TOKEN);
export const setRefreshToken = (token) => setItem(STORAGE_KEYS.REFRESH_TOKEN, token);
export const getRefreshToken = () => getItem(STORAGE_KEYS.REFRESH_TOKEN);
export const setUser = (user) => setObject(STORAGE_KEYS.USER, user);
export const getUser = () => getObject(STORAGE_KEYS.USER);

export const clearAuthData = async () => {
  await deleteItem(STORAGE_KEYS.ACCESS_TOKEN);
  await deleteItem(STORAGE_KEYS.REFRESH_TOKEN);
  await deleteItem(STORAGE_KEYS.USER);
};
