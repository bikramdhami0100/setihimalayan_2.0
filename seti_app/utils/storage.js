// Web-compatible storage using AsyncStorage.
// On native platforms, Metro will use storage.native.js (expo-secure-store) instead.
import AsyncStorage from '@react-native-async-storage/async-storage';
import { STORAGE_KEYS } from './constants';

export const setItem = async (key, value) => {
  try {
    await AsyncStorage.setItem(key, value);
  } catch (error) {
    console.error(`Error saving ${key}:`, error);
  }
};

export const getItem = async (key) => {
  try {
    return await AsyncStorage.getItem(key);
  } catch (error) {
    console.error(`Error retrieving ${key}:`, error);
    return null;
  }
};

export const deleteItem = async (key) => {
  try {
    await AsyncStorage.removeItem(key);
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