/**
 * Device info collector for login / session tracking.
 *
 * The backend enforces one active session per user, keyed on device_id.
 * We generate + cache a UUID once per install (getUniqueId under the
 * hood is Android SSAID / iOS identifierForVendor) so the same device
 * looks identical across app restarts and JWT refreshes, but changes
 * on reinstall — which is the semantics the "single active session"
 * feature needs.
 */

import {Platform} from 'react-native';
import DeviceInfo from 'react-native-device-info';

import {getItem, setItem, StorageKeys} from './storage';

let cachedDeviceId = null;

const readCachedDeviceId = async () => {
  if (cachedDeviceId) {
    return cachedDeviceId;
  }
  const stored = await getItem(StorageKeys.DEVICE_ID);
  if (stored) {
    cachedDeviceId = stored;
    return stored;
  }
  const fresh = await DeviceInfo.getUniqueId();
  await setItem(StorageKeys.DEVICE_ID, fresh);
  cachedDeviceId = fresh;
  return fresh;
};

/**
 * Returns the payload merged into every /Auth/login request.
 * Fields are named to match the backend contract agreed with the API team.
 */
export const getDeviceInfo = async () => {
  const [deviceId, manufacturer] = await Promise.all([
    readCachedDeviceId(),
    DeviceInfo.getManufacturer().catch(() => 'Unknown'),
  ]);

  return {
    device_id: deviceId,
    device_model: `${manufacturer} ${DeviceInfo.getModel()}`.trim(),
    os_version: `${Platform.OS} ${DeviceInfo.getSystemVersion()}`,
    app_version: DeviceInfo.getVersion(),
    fcm_token: null,
  };
};

/** Escape hatch for tests / diagnostics. Do not call from production code. */
export const _resetDeviceIdCache = () => {
  cachedDeviceId = null;
};
