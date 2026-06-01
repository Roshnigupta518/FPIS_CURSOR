/**
 * Auth API.
 *
 *   loginApi({mobile, password})  → { token, user }
 *   meApi()                        → { user }
 */

import {ENDPOINTS} from '../constants/api';
import {request} from './axiosInstance';

export const loginApi = async ({userId, password}) => {
  const response = await request({
    method: 'POST',
    url: ENDPOINTS.AUTH.LOGIN,
    data: {
      user_Id: userId,
      password,
    },
  });
  
  return response;
};

export const meApi = async () => {
  const {data} = await request({
    method: 'GET',
    url: ENDPOINTS.AUTH.ME,
  });
  return data.user;
};
