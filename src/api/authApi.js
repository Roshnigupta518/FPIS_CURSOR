/**
 * Auth API.
 *
 *   loginApi({userId, password})   → { token, refreshToken?, user }
 *   logoutApi()                    → { success }
 *   refreshTokenApi(refreshToken)  → { token, expiresAt }
 *   meApi()                        → { user }
 *
 * Every login call is enriched with device info (device_id, model, OS,
 * app version, fcm token) so the backend can enforce the "one active
 * session per user" rule and detect concurrent-device attempts.
 */

import {ENDPOINTS} from '../constants/api';
import {getDeviceId, getDeviceInfo} from '../utils/deviceInfo';
import {logger} from '../utils/logger';
import {getItem, StorageKeys} from '../utils/storage';
import {request} from './axiosInstance';

export const loginApi = async ({userId, password}) => {
  const deviceInfo = await getDeviceInfo();
  const body = {
    user_Id: userId,
    password,
    ...deviceInfo,
  };
  logger.debug('[LOGIN REQUEST]', body);
  const response = await request({
    method: 'POST',
    url: ENDPOINTS.AUTH.LOGIN,
    data: body,
  });
  logger.debug('[LOGIN RESPONSE]', response);
  return response;
};

export const logoutApi = async () => {
  const [refreshToken, device_id] = await Promise.all([
    getItem(StorageKeys.REFRESH_TOKEN),
    getDeviceId(),
  ]);
  const body = {refreshToken, device_id};
  logger.debug('[LOGOUT REQUEST]', body);
  const response = await request({
    method: 'POST',
    url: ENDPOINTS.AUTH.LOGOUT,
    data: body,
  });
  logger.debug('[LOGOUT RESPONSE]', response);
  return response;
};

export const refreshTokenApi = async refreshToken => {
  const device_id = await getDeviceId();
  const body = {refreshToken, device_id};
  logger.debug('[REFRESH REQUEST]', body);
  const response = await request({
    method: 'POST',
    url: ENDPOINTS.AUTH.REFRESH_TOKEN,
    data: body,
  });
  logger.debug('[REFRESH RESPONSE]', response);
  return response;
};

export const meApi = async () => {
  const {data} = await request({
    method: 'GET',
    url: ENDPOINTS.AUTH.ME,
  });
  return data.user;
};
