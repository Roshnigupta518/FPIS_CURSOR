/**
 * Report API.
 *
 *   getMyReportSummaryApi({period, from, to, schemeId})
 *   downloadMyReportExcelApi({period, from, to, schemeId})
 *
 *  Both endpoints sit under /reports and require a Bearer token, which
 *  the axios interceptor attaches automatically.
 *
 *  The summary response shape (from the backend) is:
 *  {
 *    success: true,
 *    data: {
 *      period, from, to, schemeId, total,
 *      byStatus: { PENDING_AUTH, AUTH_SUCCESS, AUTH_FAILED, SUBMITTED },
 *      byScheme: [{ id, code, name, count }, ...]
 *    }
 *  }
 */

import apiClient, {request} from './axiosInstance';
import {ENDPOINTS, UPLOAD_TIMEOUT_MS} from '../constants/api';

/* -------------------------------------------------------------------------- */
/*  Helpers                                                                    */
/* -------------------------------------------------------------------------- */

const toYmd = v => {
  if (!v) {
    return null;
  }
  const d = v instanceof Date ? v : new Date(v);
  if (Number.isNaN(d.getTime())) {
    return null;
  }
  // YYYY-MM-DD in local time so the user's "today" matches their wall clock.
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};

const buildSummaryParams = ({period, from, to, schemeId} = {}) => {
  const params = {};
  params.period = period || 'today';
  if (params.period === 'custom') {
    if (from) {
      params.from = toYmd(from);
    }
    if (to) {
      params.to = toYmd(to);
    }
  }
  if (schemeId != null && schemeId !== '' && schemeId !== 'all') {
    params.schemeId = Number(schemeId);
  }
  return params;
};

/* -------------------------------------------------------------------------- */
/*  Summary                                                                    */
/* -------------------------------------------------------------------------- */

export const getMyReportSummaryApi = async (filters = {}) => {
  const {data} = await request({
    method: 'GET',
    url: ENDPOINTS.REPORTS.MY_SUMMARY,
    params: buildSummaryParams(filters),
  });

  // Defensive defaults so the screen can render even if the server omits
  // a field on edge cases.
  return {
    period: data?.period || filters.period || 'today',
    from: data?.from || null,
    to: data?.to || null,
    schemeId: data?.schemeId ?? null,
    total: Number(data?.total || 0),
    byStatus: {
      PENDING_AUTH: Number(data?.byStatus?.PENDING_AUTH || 0),
      AUTH_SUCCESS: Number(data?.byStatus?.AUTH_SUCCESS || 0),
      AUTH_FAILED: Number(data?.byStatus?.AUTH_FAILED || 0),
      SUBMITTED: Number(data?.byStatus?.SUBMITTED || 0),
    },
    byScheme: Array.isArray(data?.byScheme)
      ? data.byScheme.map(s => ({
          id: s.id,
          code: s.code,
          name: s.name,
          count: Number(s.count || 0),
        }))
      : [],
  };
};

/* -------------------------------------------------------------------------- */
/*  Excel download                                                             */
/* -------------------------------------------------------------------------- */

/**
 * Downloads the Excel report as a base64 string + suggested filename.
 *
 * We pull the binary payload as an ArrayBuffer through the same axios
 * client (so the JWT interceptor still applies) and encode it client-side
 * — this avoids needing react-native-fs / blob plugins. The screen layer
 * then hands the base64 to the platform Share sheet as a data URL.
 */
export const downloadMyReportExcelApi = async (filters = {}) => {
  const response = await apiClient({
    method: 'GET',
    url: ENDPOINTS.REPORTS.MY_SUMMARY_EXPORT,
    params: buildSummaryParams(filters),
    responseType: 'arraybuffer',
    timeout: UPLOAD_TIMEOUT_MS,
    headers: {
      Accept:
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    },
  });

  const base64 = arrayBufferToBase64(response.data);

  const fileName =
    extractFilenameFromHeaders(response.headers) ||
    buildDefaultFileName(filters);

  return {
    base64,
    fileName,
    mimeType:
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  };
};

/* -------------------------------------------------------------------------- */
/*  internal                                                                   */
/* -------------------------------------------------------------------------- */

// React-Native-safe base64 encoder for a binary ArrayBuffer payload.
// Hermes ships without `Buffer`, so we encode by hand instead of relying
// on `btoa` (which isn't always available either across RN versions).
const B64_ALPHABET =
  'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';

/* eslint-disable no-bitwise */
const arrayBufferToBase64 = buffer => {
  if (!buffer) {
    return '';
  }
  const bytes = new Uint8Array(buffer);
  const len = bytes.length;
  let out = '';
  for (let i = 0; i < len; i += 3) {
    const b1 = bytes[i];
    const b2 = i + 1 < len ? bytes[i + 1] : 0;
    const b3 = i + 2 < len ? bytes[i + 2] : 0;
    out += B64_ALPHABET[b1 >> 2];
    out += B64_ALPHABET[((b1 & 0x03) << 4) | (b2 >> 4)];
    out += i + 1 < len ? B64_ALPHABET[((b2 & 0x0f) << 2) | (b3 >> 6)] : '=';
    out += i + 2 < len ? B64_ALPHABET[b3 & 0x3f] : '=';
  }
  return out;
};
/* eslint-enable no-bitwise */

const extractFilenameFromHeaders = headers => {
  const cd =
    headers?.['content-disposition'] || headers?.['Content-Disposition'];
  if (!cd) {
    return null;
  }
  const m = /filename\*?=(?:UTF-8'')?"?([^";]+)"?/i.exec(cd);
  return m ? decodeURIComponent(m[1]) : null;
};

const buildDefaultFileName = ({period, from, to} = {}) => {
  const stamp = toYmd(new Date());
  if (period === 'custom' && from && to) {
    return `MyReport_${toYmd(from)}_${toYmd(to)}.xlsx`;
  }
  return `MyReport_${period || 'today'}_${stamp}.xlsx`;
};
