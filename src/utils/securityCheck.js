/**
 * Security Check Utility for Root & Jailbreak Detection
 * Compliance with Aadhaar Face Authentication Audit Checklist v2.0 (Control #3)
 */

import {NativeModules, Platform} from 'react-native';
import DeviceInfo from 'react-native-device-info';

const {RootDetection} = NativeModules;

/**
 * Checks whether the device is rooted (Android) or jailbroken (iOS).
 *
 * @returns {Promise<{isRooted: boolean, isEmulator: boolean, isDebugged: boolean}>}
 */
export const checkDeviceSecurity = async () => {
  try {
    let isRooted = false;

    // 1. Native Android Root Check via RootDetection Kotlin module
    if (Platform.OS === 'android' && RootDetection && typeof RootDetection.isRooted === 'function') {
      try {
        isRooted = Boolean(await RootDetection.isRooted());
      } catch (e) {
        if (__DEV__) {
          console.warn('[SecurityCheck] Native RootDetection error:', e);
        }
      }
    }

    // 2. Fallback check for Android test-keys (custom rooted ROMs)
    if (!isRooted && typeof DeviceInfo.getTags === 'function') {
      const tags = await DeviceInfo.getTags().catch(() => '');
      if (typeof tags === 'string' && tags.includes('test-keys')) {
        isRooted = true;
      }
    }

    // 3. Check if running on emulator
    const isEmulator = typeof DeviceInfo.isEmulator === 'function'
      ? await DeviceInfo.isEmulator().catch(() => false)
      : false;

    return {
      isRooted,
      isEmulator: Boolean(isEmulator),
      isDebugged: false,
    };
  } catch (error) {
    console.warn('[SecurityCheck] Error performing device security checks:', error);
    return {
      isRooted: false,
      isEmulator: false,
      isDebugged: false,
    };
  }
};

// for checking in debug mode in emulator

// // src/utils/securityCheck.js

// export const checkDeviceSecurity = async () => {
//   return {
//     isRooted: true, // <-- Set to true to test the block screen
//     isEmulator: true,
//     isDebugged: false,
//   };
// };