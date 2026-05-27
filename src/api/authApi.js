/**
 * Auth API.
 *
 *   loginApi({mobile, password})  → { token, user }
 *   meApi()                        → { user }
 */

import {ENDPOINTS} from '../constants/api';
import {request} from './axiosInstance';

export const loginApi = async ({mobile, password}) => {
  const {data} = await request({
    method: 'POST',
    url: ENDPOINTS.AUTH.LOGIN,
    data: {mobile, password},
  });
  return data; // { token, user: { id, name, mobile, role, facility } }
};

export const meApi = async () => {
  const {data} = await request({
    method: 'GET',
    url: ENDPOINTS.AUTH.ME,
  });
  return data.user;
};
