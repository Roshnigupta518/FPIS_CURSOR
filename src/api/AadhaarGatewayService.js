import { ENDPOINTS } from '../constants/api';
import { request } from './axiosInstance';

/**
 * Calls AadhaarGateway/PrepareRequest and returns the payload that
 * the Parichai SDK expects. Server returns something like:
 *
 *   {
 *     sa: 'LITEMPLTD1',
 *     serviceType: '7',
 *     encData: '<base64 blob>',
 *     transactionId: '...',
 *     disclosureInfoType: '1'
 *   }
 *
 * Either as the body itself or wrapped under data/result — we
 * normalize both cases below.
 */
export const prepareAadhaarRequest = async ({serviceType} = {}) => {
  const {data} = await request({
    method: 'GET',
    url: ENDPOINTS.AADHAAR.PREPARE_REQUEST+serviceType,
    // params: {serviceType},
  });

  // unwrap the common envelopes
  const body = data?.data ?? data?.result ?? data;
  if (!body) {
    throw new Error('Empty PrepareRequest response');
  }
  return body;
};