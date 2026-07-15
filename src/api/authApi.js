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
import {getDeviceInfo} from '../utils/deviceInfo';
import {logger} from '../utils/logger';
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
  return request({
    method: 'POST',
    url: ENDPOINTS.AUTH.LOGOUT,
  });
};

export const refreshTokenApi = async refreshToken => {
  return request({
    method: 'POST',
    url: ENDPOINTS.AUTH.REFRESH_TOKEN,
    data: {refreshToken},
  });
};

export const meApi = async () => {
  const {data} = await request({
    method: 'GET',
    url: ENDPOINTS.AUTH.ME,
  });
  return data.user;
};
