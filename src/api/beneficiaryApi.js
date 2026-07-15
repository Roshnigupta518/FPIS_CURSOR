/**
 * Beneficiary API.
 *
 *   listBeneficiariesApi({page, limit, search, status, schemeId, facilityId, dateFrom, dateTo})
 *   getBeneficiaryByIdApi(id)
 *   createBeneficiaryApi(payload)
 *   updateBeneficiaryApi(id, patch)
 *   deleteBeneficiaryApi(id)
 *   faceAuthApi({beneficiaryId, status, image})    // image = {uri, name, type}
 */

import {ENDPOINTS, UPLOAD_TIMEOUT_MS} from '../constants/api';
import {logger} from '../utils/logger';
import {beneficiaryToServer, mapBeneficiary} from '../utils/mappers';
import {request} from './axiosInstance';

/* -------------------------------------------------------------------------- */
/*  LIST                                                                       */
/* -------------------------------------------------------------------------- */

export const listBeneficiariesApi = async (filters = {}) => {
  const params = {};
  if (filters.page)       params.page        = filters.page;
  if (filters.limit)      params.limit       = filters.limit;
  if (filters.search)     params.search      = filters.search;
  if (filters.status)     params.status      = filters.status;
  if (filters.schemeId)   params.scheme_id   = filters.schemeId;
  if (filters.facilityId) params.facility_id = filters.facilityId;
  if (filters.dateFrom)   params.date_from   = filters.dateFrom;
  if (filters.dateTo)     params.date_to     = filters.dateTo;

  logger.debug('[BENEFICIARIES.LIST] params', params);
  const {data, meta} = await request({
    method: 'GET',
    url: ENDPOINTS.BENEFICIARIES.LIST,
    params,
  });

  return {
    items: (data || []).map(mapBeneficiary),
    meta: meta || {page: 1, totalPages: 1, total: 0, hasNext: false},
  };
};

/* -------------------------------------------------------------------------- */
/*  CRUD                                                                       */
/* -------------------------------------------------------------------------- */

export const getBeneficiaryByIdApi = async id => {
  const {data} = await request({
    method: 'GET',
    url: ENDPOINTS.BENEFICIARIES.BY_ID(id),
  });
  return mapBeneficiary(data);
};

export const createBeneficiaryApi = async (form, extras) => {
  const payload = beneficiaryToServer(form, extras);
  logger.debug('[BENEFICIARIES.CREATE] payload', payload);
  const {data} = await request({
    method: 'POST',
    url: ENDPOINTS.BENEFICIARIES.LIST,
    data: payload,
  });
  return data;
};

export const updateBeneficiaryApi = async (id, form, extras) => {
  const payload = beneficiaryToServer(form, extras);
  const {data} = await request({
    method: 'PUT',
    url: ENDPOINTS.BENEFICIARIES.BY_ID(id),
    data: payload,
  });
  return mapBeneficiary(data);
};

export const deleteBeneficiaryApi = async id => {
  await request({
    method: 'DELETE',
    url: ENDPOINTS.BENEFICIARIES.BY_ID(id),
  });
  return id;
};

/* -------------------------------------------------------------------------- */
/*  FACE AUTH                                                                  */
/* -------------------------------------------------------------------------- */

/**
 * Multipart upload of the face image + outcome.
 *
 * `image` is the shape react-native-image-picker returns:
 *   { uri, fileName, type, fileSize }
 *
 * React Native's FormData expects the file object as `{uri, name, type}`.
 */
export const faceAuthApi = async ({beneficiaryId, status, image}) => {
  if (!image?.uri) {
    const err = new Error('Image is required');
    err.status = 400;
    throw err;
  }

  const form = new FormData();
  form.append('beneficiary_id', String(beneficiaryId));
  form.append('auth_status', status);
  form.append('image', {
    uri: image.uri,
    name: image.fileName || `face_${Date.now()}.jpg`,
    type: image.type || 'image/jpeg',
  });

  const {data} = await request({
    method: 'POST',
    url: ENDPOINTS.BENEFICIARIES.FACE_AUTH,
    data: form,
    headers: {'Content-Type': 'multipart/form-data'},
    timeout: UPLOAD_TIMEOUT_MS,
    transformRequest: v => v,                    // keep FormData intact
  });

  return mapBeneficiary(data);
};
