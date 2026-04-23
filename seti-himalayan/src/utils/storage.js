import * as SecureStore from 'expo-secure-store';
import { STORAGE_KEYS } from './constants';

/**
 * Save a string value securely
 * @param {string} key - Storage key
 * @param {string} value - Value to store
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
 * @param {string} key - Storage key
 * @returns {string|null}
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
 * @param {string} key - Storage key
 */
export const deleteItem = async (key) => {
  try {
    await SecureStore.deleteItemAsync(key);
  } catch (error) {
    console.error(`Error deleting ${key}:`, error);
  }
};

/**
 * Save an object securely (stringify)
 * @param {string} key - Storage key
 * @param {Object} value - Object to store
 */
export const setObject = async (key, value) => {
  await setItem(key, JSON.stringify(value));
};

/**
 * Retrieve an object securely (parse)
 * @param {string} key - Storage key
 * @returns {Object|null}
 */
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

/**
 * Store access token
 * @param {string} token - JWT access token
 */
export const setAccessToken = (token) => setItem(STORAGE_KEYS.ACCESS_TOKEN, token);

/**
 * Get access token
 * @returns {Promise<string|null>}
 */
export const getAccessToken = () => getItem(STORAGE_KEYS.ACCESS_TOKEN);

/**
 * Store refresh token
 * @param {string} token - JWT refresh token
 */
export const setRefreshToken = (token) => setItem(STORAGE_KEYS.REFRESH_TOKEN, token);

/**
 * Get refresh token
 * @returns {Promise<string|null>}
 */
export const getRefreshToken = () => getItem(STORAGE_KEYS.REFRESH_TOKEN);

/**
 * Store user object
 * @param {Object} user - User data
 */
export const setUser = (user) => setObject(STORAGE_KEYS.USER, user);

/**
 * Get user object
 * @returns {Promise<Object|null>}
 */
export const getUser = () => getObject(STORAGE_KEYS.USER);

/**
 * Clear all auth data (logout)
 */
export const clearAuthData = async () => {
  await deleteItem(STORAGE_KEYS.ACCESS_TOKEN);
  await deleteItem(STORAGE_KEYS.REFRESH_TOKEN);
  await deleteItem(STORAGE_KEYS.USER);
};