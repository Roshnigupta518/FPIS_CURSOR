/**
 * Centralized axios instance.
 *
 *  - Attaches Bearer token from AsyncStorage on every request.
 *  - Normalizes errors into a small { status, message, errors } shape.
 *  - On HTTP 401:
 *      1. Tries to silently swap the expired access token for a fresh
 *         one using the refresh token, then replays the original request.
 *      2. If that fails, invokes the registered unauthorized handler
 *         so the auth slice can clear state + bounce the user back
 *         to Login.
 *  - Login endpoint itself is exempted from the 401 refresh dance
 *    (a bad password should surface immediately, not attempt refresh).
 */

import axios from 'axios';

import {API_BASE_URL, ENDPOINTS, REQUEST_TIMEOUT_MS} from '../constants/api';
import {getDeviceId} from '../utils/deviceInfo';
import {logger} from '../utils/logger';
import {getItem, removeItem, setItem, StorageKeys} from '../utils/storage';

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

const AUTH_PATHS_SKIP_REFRESH = new Set([
  ENDPOINTS.AUTH.LOGIN,
  ENDPOINTS.AUTH.REFRESH_TOKEN,
  ENDPOINTS.AUTH.LOGOUT,
]);

/* -------------------------------------------------------------------------- */
/*  Refresh-token single-flight                                                */
/* -------------------------------------------------------------------------- */
/* Multiple in-flight requests can all hit 401 simultaneously. We de-dupe by   */
/* keeping a single refresh promise; every 401 awaits the same result.        */
/* -------------------------------------------------------------------------- */

let refreshInFlight = null;

const doRefresh = async () => {
  const refreshToken = await getItem(StorageKeys.REFRESH_TOKEN);
  if (!refreshToken) {
    logger.debug('[REFRESH] no refresh token in storage — giving up');
    return null;
  }
  const device_id = await getDeviceId();
  logger.debug('[REFRESH] attempting refresh', {device_id});

  try {
    // Use a bare axios (not apiClient) so we don't recurse through
    // our own interceptors if the refresh itself returns 401.
    const {data} = await axios.post(
      `${API_BASE_URL}${ENDPOINTS.AUTH.REFRESH_TOKEN}`,
      {refreshToken, device_id},
      {timeout: REQUEST_TIMEOUT_MS},
    );
    const newToken = data?.data?.token;
    const newRefreshToken = data?.data?.refreshToken;
    logger.debug('[REFRESH] response', data);
    if (!newToken) {
      return null;
    }
    await setItem(StorageKeys.AUTH_TOKEN, newToken);
    // Some backends rotate the refresh token on every use (recommended
    // for security). Persist the new one if present, keep the old one
    // if the server chose to return the same value.
    if (newRefreshToken) {
      await setItem(StorageKeys.REFRESH_TOKEN, newRefreshToken);
    }
    return newToken;
  } catch (e) {
    logger.warn('[REFRESH] failed', e?.response?.status, e?.response?.data);
    return null;
  }
};

const refreshAccessToken = () => {
  if (!refreshInFlight) {
    refreshInFlight = doRefresh().finally(() => {
      refreshInFlight = null;
    });
  }
  return refreshInFlight;
};

/* -------------------------------------------------------------------------- */
/*  Interceptors                                                               */
/* -------------------------------------------------------------------------- */

apiClient.interceptors.request.use(async config => {
  try {
    const token = await getItem(StorageKeys.AUTH_TOKEN);
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  } catch (_e) {
    /* request continues unauthenticated */
  }
  return config;
});

apiClient.interceptors.response.use(
  response => response,
  async error => {
    const status = error?.response?.status;
    const body = error?.response?.data;
    const originalRequest = error?.config;
    const requestUrl = originalRequest?.url || '';

    if (
      status === 401 &&
      originalRequest &&
      !originalRequest.__isRetry &&
      !AUTH_PATHS_SKIP_REFRESH.has(requestUrl)
    ) {
      const newToken = await refreshAccessToken();
      if (newToken) {
        originalRequest.__isRetry = true;
        originalRequest.headers = {
          ...(originalRequest.headers || {}),
          Authorization: `Bearer ${newToken}`,
        };
        return apiClient(originalRequest);
      }

      await removeItem(StorageKeys.AUTH_TOKEN);
      await removeItem(StorageKeys.REFRESH_TOKEN);

      if (typeof unauthorizedHandler === 'function') {
        try {
          unauthorizedHandler();
        } catch (_e) {
          /* swallow — last-resort cleanup */
        }
      }
    }

    const normalized = {
      status: status || 0,
      message:
        body?.message ||
        (error.code === 'ECONNABORTED'
          ? 'Request timed out'
          : error.message || 'Network error'),
      errorCode: body?.errorCode,
      errors: body?.errors,
      data: body?.data,
      raw: error,
    };

    return Promise.reject(normalized);
  },
);

/**
 * Tiny helper so api modules don't all repeat `.then(r => r.data.data)`.
 */
export const request = async (config, {raw = false} = {}) => {
  const response = await apiClient(config);
  if (raw) {
    return response;
  }
  // Backend envelope: { success, message, data, meta }
  return {
    success: response.data?.success,
    data: response.data?.data,
    meta: response.data?.meta,
    message: response.data?.message,
  };
};

export default apiClient;
