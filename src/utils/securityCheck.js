/**
 * Security Check Utility for Root & Jailbreak Detection
 * Compliance with Aadhaar Face Authentication Audit Checklist v2.0 (Control #3)
 */

import DeviceInfo from 'react-native-device-info';

/**
 * Checks whether the device is rooted (Android) or jailbroken (iOS).
 *
 * @returns {Promise<{isRooted: boolean, isEmulator: boolean}>}
 */
export const checkDeviceSecurity = async () => {
  try {
    const [isJailBroken, isEmulator] = await Promise.all([
      DeviceInfo.isJailBroken().catch(() => false),
      DeviceInfo.isEmulator().catch(() => false),
    ]);

    return {
      isRooted: Boolean(isJailBroken),
      isEmulator: Boolean(isEmulator),
    };
  } catch (error) {
    console.warn('[SecurityCheck] Error performing device security checks:', error);
    return {
      isRooted: false,
      isEmulator: false,
    };
  }
};


// src/utils/securityCheck.js

// export const checkDeviceSecurity = async () => {
//   // MOCK FOR EMULATOR TESTING
//   return {
//     isRooted: true, // Set to true to test the blocked screen
//     isEmulator: true,
//   };
// };