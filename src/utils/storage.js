/**
 * Thin AsyncStorage wrapper used for session token persistence.
 * The app itself is online-only — storage is *only* used for auth
 * tokens and the user's language preference, never for beneficiary data.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

export const StorageKeys = {
  AUTH_TOKEN: '@fwa/authToken',
  REFRESH_TOKEN: '@fwa/refreshToken',
  USER: '@fwa/user',
  LANGUAGE: '@fwa/language',
  DEVICE_ID: '@fwa/deviceId',
  SAVED_USER_ID: '@fwa/savedUserId',
};

export const setItem = async (key, value) => {
  try {
    const v = typeof value === 'string' ? value : JSON.stringify(value);
    await AsyncStorage.setItem(key, v);
  } catch (e) {
    if (__DEV__) console.warn('storage.setItem failed', key, e);
  }
};

export const getItem = async (key, asJson = false) => {
  try {
    const v = await AsyncStorage.getItem(key);
    if (v === null) return null;
    return asJson ? JSON.parse(v) : v;
  } catch (e) {
    if (__DEV__) console.warn('storage.getItem failed', key, e);
    return null;
  }
};

export const removeItem = async key => {
  try {
    await AsyncStorage.removeItem(key);
  } catch (e) {
    if (__DEV__) console.warn('storage.removeItem failed', key, e);
  }
};

export const clearAll = async () => {
  try {
    await AsyncStorage.clear();
  } catch (e) {
    if (__DEV__) console.warn('storage.clearAll failed', e);
  }
};
