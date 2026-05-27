/**
 * Scheme API.
 *
 *   listSchemesApi()
 *   listSchemesByFacilityTypeApi(type)   // type: 'chc' | 'ch' | 'phc' | …
 */

import {ENDPOINTS} from '../constants/api';
import {mapScheme} from '../utils/mappers';
import {request} from './axiosInstance';

export const listSchemesApi = async () => {
  const {data} = await request({
    method: 'GET',
    url: ENDPOINTS.SCHEMES.LIST,
  });
  return (data || []).map(mapScheme);
};

export const listSchemesByFacilityTypeApi = async type => {
  const {data} = await request({
    method: 'GET',
    url: ENDPOINTS.SCHEMES.BY_FACILITY_TYPE(String(type).toLowerCase()),
  });
  return (data || []).map(mapScheme);
};
