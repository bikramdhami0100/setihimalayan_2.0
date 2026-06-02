import * as SecureStore from 'expo-secure-store';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { STORAGE_KEYS } from './constants';

let useFallback = false;

const secureSet = async (key, value) => {
  try {
    await SecureStore.setItemAsync(key, value);
    return true;
  } catch (error) {
    console.warn(`SecureStore failed for ${key}, falling back to AsyncStorage:`, error.message);
    return false;
  }
};

const secureGet = async (key) => {
  try {
    return await SecureStore.getItemAsync(key);
  } catch (error) {
    console.warn(`SecureStore get failed for ${key}:`, error.message);
    return null;
  }
};

const secureDelete = async (key) => {
  try {
    await SecureStore.deleteItemAsync(key);
  } catch (error) {
    console.warn(`SecureStore delete failed for ${key}:`, error.message);
  }
};

export const setItem = async (key, value) => {
  const ok = await secureSet(key, value);
  if (!ok) {
    useFallback = true;
    await AsyncStorage.setItem(key, value);
  }
};

export const getItem = async (key) => {
  if (useFallback) {
    try { return await AsyncStorage.getItem(key); } catch { return null; }
  }
  const val = await secureGet(key);
  if (val === null && !useFallback) {
    const fallback = await AsyncStorage.getItem(key).catch(() => null);
    if (fallback !== null) {
      useFallback = true;
      return fallback;
    }
  }
  return val;
};

export const deleteItem = async (key) => {
  await secureDelete(key);
  try { await AsyncStorage.removeItem(key); } catch {}
};

export const setObject = async (key, value) => {
  await setItem(key, JSON.stringify(value));
};

export const getObject = async (key) => {
  const data = await getItem(key);
  if (data) {
    try { return JSON.parse(data); } catch { return null; }
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
