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
  if (Platform.OS === 'android') return `https://139.5.6.137/FPIS_API_APP/api`;
  // iOS simulator can hit localhost directly.
  return `http://localhost:${PORT}/api`;
};

export const API_BASE_URL = __DEV__
  ? buildDevUrl()
  : 'https://139.5.6.137/FPIS_API_APP/api';

export const REQUEST_TIMEOUT_MS = 20000;
export const UPLOAD_TIMEOUT_MS = 45000;

export const ENDPOINTS = {
  AUTH: {
    LOGIN: '/Auth/login',
    LOGOUT: '/Auth/logout',
    REFRESH_TOKEN: '/Auth/refresh',
    ME: '/auth/me',
    REGISTER: '/auth/register',
    FORGOT_PASSWORD_REQUEST_OTP: '/auth/forgot-password/request-otp',
    FORGOT_PASSWORD_VERIFY_OTP: '/auth/forgot-password/verify-otp',
    FORGOT_PASSWORD_RESET: '/auth/forgot-password/reset',
  },
  FACILITIES: {
    LIST: '/facilities?userId=',
    BY_ID: id => `/facilities/${id}`,
  },
  SCHEMES: {
    LIST: '/schemes?facilityTypeId=',
    BY_FACILITY_TYPE: type => `/schemes/${type}`,
  },
  BENEFICIARIES: {
    LIST: '/beneficiaries',
    BY_ID : id => `/beneficiaries/by-id?BeneficiaryID=${id}`,
    FACE_AUTH: '/beneficiaries/face-auth',
  },
  AADHAAR: {
    PREPARE_REQUEST: '/AadhaarGateway/PrepareRequest?serviceType=',
  },
  REPORTS: {
    MY_SUMMARY: '/reports/my-summary',
    MY_SUMMARY_EXPORT: '/reports/my-summary/export',
    MY_BENEFICIARIES: '/reports/my-beneficiaries',
  },
};
