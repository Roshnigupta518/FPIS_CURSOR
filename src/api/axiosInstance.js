/**
 * Centralized axios instance.
 *
 *  - Attaches Bearer token from AsyncStorage on every request.
 *  - Normalizes errors into a small { status, message, errors } shape.
 *  - On HTTP 401, invokes a registered unauthorized handler so the
 *    auth slice can clear state + bounce the user back to Login.
 */

import axios from 'axios';

import {
  API_BASE_URL,
  REQUEST_TIMEOUT_MS,
} from '../constants/api';
import {getItem, StorageKeys} from '../utils/storage';

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: REQUEST_TIMEOUT_MS,
  headers: {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  },
});

/* -------------------------------------------------------------------------- */
/*  401 handler hook                                                           */
/* -------------------------------------------------------------------------- */
/* Registered once from the store/App so the axios module doesn't have a       */
/* circular dependency on the redux slice.                                     */
/* -------------------------------------------------------------------------- */

let unauthorizedHandler = null;
export const setUnauthorizedHandler = fn => {
  unauthorizedHandler = fn;
};

/* -------------------------------------------------------------------------- */
/*  Interceptors                                                               */
/* -------------------------------------------------------------------------- */

apiClient.interceptors.request.use(async config => {
  try {
    const token = await getItem(StorageKeys.AUTH_TOKEN);
    if (token) config.headers.Authorization = `Bearer ${token}`;
  } catch (_e) {
    /* request continues unauthenticated */
  }
  if (__DEV__) {
    // eslint-disable-next-line no-console
    console.log(`[API →] ${config.method?.toUpperCase()} ${config.url}`);
  }
  return config;
});

apiClient.interceptors.response.use(
  response => {
    if (__DEV__) {
      // eslint-disable-next-line no-console
      console.log(
        `[API ←] ${response.config.method?.toUpperCase()} ${response.config.url} ${response.status}`,
      );
    }
    return response;
  },
  error => {
    const status = error?.response?.status;
    const body = error?.response?.data;
    const normalized = {
      status: status || 0,
      message:
        body?.message ||
        (error.code === 'ECONNABORTED'
          ? 'Request timed out'
          : error.message || 'Network error'),
      errors: body?.errors,
      raw: error,
    };

    if (status === 401 && typeof unauthorizedHandler === 'function') {
      try {
        unauthorizedHandler();
      } catch (_e) {
        /* swallow — last-resort cleanup */
      }
    }

    if (__DEV__) {
      // eslint-disable-next-line no-console
      console.log(
        `[API ✗] ${error.config?.method?.toUpperCase() || ''} ${
          error.config?.url || ''
        } → ${normalized.status} ${normalized.message}`,
      );
    }

    return Promise.reject(normalized);
  },
)

/**
 * Tiny helper so api modules don't all repeat `.then(r => r.data.data)`.
 */
export const request = async (config, {raw = false} = {}) => {
  const response = await apiClient(config);
  console.log({response: JSON.stringify(response.data)})
  if (raw) return response.data;
  // Backend envelope: { success, message, data, meta }
  return {
    data: response.data?.data,
    meta: response.data?.meta,
    message: response.data?.message,
  };
};

export default apiClient;
