/**
 * Facility API.
 *
 *   listFacilitiesApi()       → role-filtered facility list (preselected
 *                                flag included for district/medical)
 *   getFacilityByIdApi(id)
 */

import {ENDPOINTS} from '../constants/api';
import {mapFacility} from '../utils/mappers';
import {request} from './axiosInstance';

export const listFacilitiesApi = async () => {
  const {data, meta} = await request({
    method: 'GET',
    url: ENDPOINTS.FACILITIES.LIST,
  });
  return {
    items: (data || []).map(mapFacility),
    meta: meta || {},
  };
};

export const getFacilityByIdApi = async id => {
  const {data} = await request({
    method: 'GET',
    url: ENDPOINTS.FACILITIES.BY_ID(id),
  });
  return mapFacility(data);
};
