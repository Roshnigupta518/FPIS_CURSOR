/**
 * API base URLs + endpoint paths.
 *
 * Use the platform-aware base URL so the same code works on
 * Android emulator (10.0.2.2), iOS simulator (localhost), and
 * physical devices (LAN IP — fill DEV_LAN_IP below).
 *
 * Switch to PROD_BASE_URL when shipping a release build.
 */

import {Platform} from 'react-native';

// >>> Set this to your Mac's LAN IP when testing on a physical phone.
//     e.g. '192.168.1.42'. Find it via System Settings → Network → Wi-Fi.
const DEV_LAN_IP = null;

const PORT = 8082;

const buildDevUrl = () => {
  if (DEV_LAN_IP) return `http://${DEV_LAN_IP}:${PORT}/api`;
  // Android emulator forwards 10.0.2.2 → host machine's localhost.
  if (Platform.OS === 'android') return `http://139.5.6.137/FPIS_API_APP/api`;
  // iOS simulator can hit localhost directly.
  return `http://localhost:${PORT}/api`;
};

export const API_BASE_URL = __DEV__
  ? buildDevUrl()
  : 'http://139.5.6.137/FPIS_API_APP/api';

export const REQUEST_TIMEOUT_MS = 20000;
export const UPLOAD_TIMEOUT_MS = 45000;

export const ENDPOINTS = {
  AUTH: {
    LOGIN: '/Auth/login',
    ME: '/auth/me',
    REGISTER: '/auth/register',
  },
  FACILITIES: {
    LIST: '/facilities',
    BY_ID: id => `/facilities/${id}`,
  },
  SCHEMES: {
    LIST: '/schemes',
    BY_FACILITY_TYPE: type => `/schemes/${type}`,
  },
  BENEFICIARIES: {
    LIST: '/beneficiaries',
    BY_ID: id => `/beneficiaries/${id}`,
    FACE_AUTH: '/beneficiaries/face-auth',
  },
};
