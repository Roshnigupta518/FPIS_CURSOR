/**
 * Secure Storage Utility for Authentication Tokens & App State.
 *
 * Compliance with Aadhaar Face Authentication Audit Checklist v2.0 (Control #7: Hardcoding of Security Keys).
 *
 * Uses `react-native-keychain` (Android Keystore / iOS Keychain Enclave) for sensitive
 * security credentials (AUTH_TOKEN, REFRESH_TOKEN) and AsyncStorage for non-sensitive settings.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Keychain from 'react-native-keychain';

export const StorageKeys = {
  AUTH_TOKEN: '@fwa/authToken',
  REFRESH_TOKEN: '@fwa/refreshToken',
  USER: '@fwa/user',
  LANGUAGE: '@fwa/language',
  DEVICE_ID: '@fwa/deviceId',
  SAVED_USER_ID: '@fwa/savedUserId',
};

// Set of keys categorized as sensitive security credentials
const SENSITIVE_KEYS = new Set([
  StorageKeys.AUTH_TOKEN,
  StorageKeys.REFRESH_TOKEN,
]);

/**
 * Stores item in Android Keystore / iOS Keychain if sensitive, otherwise in AsyncStorage.
 */
export const setItem = async (key, value) => {
  try {
    const stringValue = typeof value === 'string' ? value : JSON.stringify(value);

    if (SENSITIVE_KEYS.has(key)) {
      // Store in Android Keystore / iOS Keychain
      await Keychain.setGenericPassword(key, stringValue, {
        service: key,
        accessible: Keychain.ACCESSIBLE.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
      });
      return;
    }

    await AsyncStorage.setItem(key, stringValue);
  } catch (e) {
    if (__DEV__) {
      console.warn('[SecureStorage] setItem failed for key:', key, e);
    }
    // Fallback to AsyncStorage if native Keychain fails
    try {
      const v = typeof value === 'string' ? value : JSON.stringify(value);
      await AsyncStorage.setItem(key, v);
    } catch (fallbackErr) {
      if (__DEV__) {
        console.warn('[SecureStorage] AsyncStorage fallback failed:', fallbackErr);
      }
    }
  }
};

/**
 * Retrieves item from Android Keystore / iOS Keychain if sensitive, otherwise from AsyncStorage.
 */
export const getItem = async (key, asJson = false) => {
  try {
    if (SENSITIVE_KEYS.has(key)) {
      // Retrieve from Android Keystore / iOS Keychain
      const credentials = await Keychain.getGenericPassword({
        service: key,
      });

      if (credentials && credentials.password) {
        return asJson ? JSON.parse(credentials.password) : credentials.password;
      }
    }

    // Standard AsyncStorage retrieval
    const v = await AsyncStorage.getItem(key);
    if (v === null) {
      return null;
    }
    return asJson ? JSON.parse(v) : v;
  } catch (e) {
    if (__DEV__) {
      console.warn('[SecureStorage] getItem failed for key:', key, e);
    }
    // Fallback to AsyncStorage
    try {
      const v = await AsyncStorage.getItem(key);
      if (v === null) {
        return null;
      }
      return asJson ? JSON.parse(v) : v;
    } catch (fallbackErr) {
      return null;
    }
  }
};

/**
 * Removes a specific key from Android Keystore / iOS Keychain or AsyncStorage.
 */
export const removeItem = async (key) => {
  try {
    if (SENSITIVE_KEYS.has(key)) {
      await Keychain.resetGenericPassword({
        service: key,
      });
    }
    await AsyncStorage.removeItem(key);
  } catch (e) {
    if (__DEV__) {
      console.warn('[SecureStorage] removeItem failed for key:', key, e);
    }
  }
};

/**
 * Clears all stored app data & security credentials on logout.
 */
export const clearAll = async () => {
  try {
    for (const key of SENSITIVE_KEYS) {
      await Keychain.resetGenericPassword({
        service: key,
      }).catch(() => {});
    }
    await AsyncStorage.clear();
  } catch (e) {
    if (__DEV__) {
      console.warn('[SecureStorage] clearAll failed:', e);
    }
  }
};
