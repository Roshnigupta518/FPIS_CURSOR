/**
 * DEV-only helpers to exercise the refresh-token flow.
 *
 * These functions must never ship in a release build. They are guarded
 * with an `if (!__DEV__) return` so even if some UI accidentally calls
 * one of them in a production APK, it becomes a no-op.
 *
 * Typical dev usage from any screen:
 *
 *   import {breakAccessToken, dumpAuthTokens} from '../utils/authTestHelpers';
 *   // ...
 *   <Button title="Corrupt token" onPress={breakAccessToken} />
 *
 * After tapping "Corrupt token" once, any subsequent authenticated
 * request will hit HTTP 401, which triggers axiosInstance.js →
 * doRefresh(), which should swap in a fresh access token, then replay
 * the original request. Watch Metro / logcat for lines starting with
 * `[REFRESH]` to see the flow.
 */

import {getItem, setItem, StorageKeys} from './storage';
import {logger} from './logger';

/**
 * Corrupt the last 4 characters of the stored access token so the
 * next request 401s at the server. Refresh token is left intact so
 * the refresh handshake can succeed.
 */
export const breakAccessToken = async () => {
  if (!__DEV__) {
    return;
  }
  const token = await getItem(StorageKeys.AUTH_TOKEN);
  if (!token) {
    logger.warn('[TEST] no access token to break');
    return;
  }
  const broken = token.slice(0, -4) + 'XXXX';
  await setItem(StorageKeys.AUTH_TOKEN, broken);
  logger.debug('[TEST] access token corrupted — next API call should 401');
};

/**
 * Wipe the refresh token so `doRefresh()` can prove that it correctly
 * bails out and the axios 401 handler falls back to force-logout.
 */
export const breakRefreshToken = async () => {
  if (!__DEV__) {
    return;
  }
  await setItem(StorageKeys.REFRESH_TOKEN, 'invalid-refresh-token-for-testing');
  logger.debug('[TEST] refresh token corrupted — next refresh must fail');
};

/**
 * Print both tokens (first 40 chars each) to Metro. Useful for
 * confirming that a refresh actually rotated the access token.
 */
export const dumpAuthTokens = async () => {
  if (!__DEV__) {
    return null;
  }
  const [access, refresh] = await Promise.all([
    getItem(StorageKeys.AUTH_TOKEN),
    getItem(StorageKeys.REFRESH_TOKEN),
  ]);
  const snapshot = {
    accessToken: access ? `${access.slice(0, 40)}…` : null,
    refreshToken: refresh ? `${refresh.slice(0, 40)}…` : null,
  };
  logger.debug('[TEST] current tokens', snapshot);
  return snapshot;
};
