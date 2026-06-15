/**
 * Report API.
 *
 *   getMyReportSummaryApi({period, from, to, schemeId})
 *   getMyReportBeneficiariesApi({period, from, to, schemeId, page, limit})
 *   downloadMyReportExcelApi({period, from, to, schemeId})
 *
 *  All endpoints sit under /reports (or in the case of the beneficiary
 *  list, fall through to the existing /beneficiaries endpoint with the
 *  date range derived from the report period) and require a Bearer
 *  token, which the axios interceptor attaches automatically.
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
 *
 *  ── MOCK MODE ──
 *  Flip MOCK_MODE to false once the real backend is reachable. While true
 *  both endpoints short-circuit and return varied dummy data (so the KPI
 *  cards, scheme breakdown table, empty state, and the share-sheet flow
 *  can all be exercised without a server).
 */

import apiClient, {request} from './axiosInstance';
import {ENDPOINTS, UPLOAD_TIMEOUT_MS} from '../constants/api';
import {mapBeneficiary} from '../utils/mappers';

const MOCK_MODE = true;

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
  if (MOCK_MODE) {
    // Tiny artificial latency so the loader is visibly exercised.
    await new Promise(resolve => setTimeout(resolve, 350));
    return buildMockSummary(filters);
  }

  const {data, meta} = await request({
    method: 'GET',
    url: ENDPOINTS.REPORTS.MY_SUMMARY,
    params: buildSummaryParams(filters),
  });

  // Backend puts the resolved window in `meta`; the counts in `data`.
  return {
    period: meta?.period || filters.period || 'today',
    from: meta?.from || null,
    to: meta?.to || null,
    schemeId: meta?.schemeId ?? null,
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
/*  Beneficiary list                                                           */
/* -------------------------------------------------------------------------- */

/**
 * Returns the user's own beneficiaries that match the current report
 * filters. In MOCK_MODE we synthesize a deterministic list whose scheme
 * + status distribution mirrors `buildMockSummary` so the screen looks
 * coherent. In real mode we hit /reports/my-beneficiaries which is
 * scoped server-side to `created_by = req.user.id` and accepts the same
 * `period`/`from`/`to`/`schemeId` query as the summary endpoint.
 */
export const getMyReportBeneficiariesApi = async (filters = {}) => {
  if (MOCK_MODE) {
    await new Promise(resolve => setTimeout(resolve, 250));
    return buildMockBeneficiaries(filters);
  }

  const params = buildSummaryParams(filters);
  if (filters.page) {
    params.page = filters.page;
  }
  params.limit = filters.limit || 50;

  const response = await request({
    method: 'GET',
    url: ENDPOINTS.REPORTS.MY_BENEFICIARIES,
    params,
  });

  // request() unwraps the envelope to { data, meta }; the rows come
  // back snake_case from the backend, so push them through the shared
  // mapper for the same camelCase shape BeneficiaryCard expects.
  const rows = Array.isArray(response.data) ? response.data : [];
  return {
    items: rows.map(mapBeneficiary),
    total: response.meta?.total ?? rows.length,
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
  if (MOCK_MODE) {
    await new Promise(resolve => setTimeout(resolve, 600));
    return buildMockExcelDownload(filters);
  }

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

/* -------------------------------------------------------------------------- */
/*  Mock data (only used while MOCK_MODE === true)                             */
/* -------------------------------------------------------------------------- */

// Base counts loosely matching the "today" scenario from the spec; all
// other periods scale proportionally so the KPIs feel different as the
// user taps each chip.
const MOCK_SCHEMES = [
  {id: 2, code: 'FST', name: 'महिला नसबंदी', base: 18},
  {id: 1, code: 'NSV', name: 'पुरुष नसबंदी', base: 12},
  {id: 3, code: 'ANT', name: 'अंतरा गर्भनिरोधक', base: 8},
  {id: 4, code: 'PPIUCD', name: 'प्रसव पश्चात आईयूसीडी', base: 5},
  {id: 5, code: 'FPCS', name: 'परिवार नियोजन क्षतिपूर्ति', base: 2},
];

const PERIOD_MULT = {
  today: 1,
  week: 3,
  month: 8,
  all: 20,
  custom: 5,
};

const buildMockSummary = (filters = {}) => {
  const period = filters.period || 'today';
  const mult = PERIOD_MULT[period] ?? 1;

  let rows = MOCK_SCHEMES.map(s => ({
    id: s.id,
    code: s.code,
    name: s.name,
    count: s.base * mult,
  }));

  if (
    filters.schemeId != null &&
    filters.schemeId !== '' &&
    filters.schemeId !== 'all'
  ) {
    rows = rows.filter(r => Number(r.id) === Number(filters.schemeId));
  }

  rows.sort((a, b) => b.count - a.count);

  const total = rows.reduce((sum, r) => sum + r.count, 0);

  // Distribution roughly matching the spec example: ~25% pending, ~10%
  // failed, the rest submitted.
  const pending = Math.round(total * 0.25);
  const failed = Math.round(total * 0.1);
  const submitted = Math.max(0, total - pending - failed);

  // Reasonable from/to so the Excel sheet can quote a date range.
  const now = new Date();
  let from = filters.from ? new Date(filters.from) : new Date(now);
  let to = filters.to ? new Date(filters.to) : new Date(now);
  if (period === 'today') {
    from = startOfDay(now);
    to = endOfDay(now);
  } else if (period === 'week') {
    from = startOfDay(addDays(now, -6));
    to = endOfDay(now);
  } else if (period === 'month') {
    from = startOfDay(addDays(now, -29));
    to = endOfDay(now);
  } else if (period === 'all') {
    from = startOfDay(new Date(now.getFullYear() - 1, now.getMonth(), 1));
    to = endOfDay(now);
  }

  return {
    period,
    from: from.toISOString(),
    to: to.toISOString(),
    schemeId: filters.schemeId ?? null,
    total,
    byStatus: {
      PENDING_AUTH: pending,
      AUTH_SUCCESS: 0,
      AUTH_FAILED: failed,
      SUBMITTED: submitted,
    },
    byScheme: rows,
  };
};

/* --- Mock beneficiary list -------------------------------------------------
 * Builds a list whose scheme + status mix mirrors the summary, capped to a
 * sensible upper bound so the screen stays performant. Keeping the seed
 * deterministic per filter set means pulling-to-refresh shows the same
 * data — easier to reason about while testing.
 */

const FACILITIES = [
  'PHC रामपुर',
  'CHC गांधी नगर',
  'DH जिला अस्पताल',
  'CH सिविल अस्पताल',
  'PHC नई बस्ती',
];

const FIRST_NAMES = [
  'रीता',
  'सुमन',
  'अंजली',
  'पूनम',
  'मीना',
  'राहुल',
  'अमित',
  'विकास',
  'सोनू',
  'कविता',
  'गीता',
  'सरोज',
  'राधा',
  'प्रिया',
  'अनुज',
];

const LAST_NAMES = [
  'शर्मा',
  'वर्मा',
  'कुमारी',
  'यादव',
  'गुप्ता',
  'सिंह',
  'मिश्रा',
  'पाटिल',
  'चौहान',
  'जैन',
];

const STATUS_ORDER = [
  'PENDING_AUTH',
  'SUBMITTED',
  'AUTH_FAILED',
  'AUTH_SUCCESS',
];

const MAX_LIST_ITEMS = 30;

const pickFrom = (arr, idx) => arr[idx % arr.length];

const buildMockBeneficiaries = (filters = {}) => {
  const summary = buildMockSummary(filters);

  // Produce items proportional to byScheme so the list "explains" the
  // breakdown numbers above it, but cap to avoid rendering hundreds of
  // cards inside a ScrollView.
  const items = [];
  let cursor = 0;
  for (const scheme of summary.byScheme) {
    const want = Math.min(scheme.count, MAX_LIST_ITEMS - items.length);
    for (let i = 0; i < want; i++) {
      const seed = cursor++;
      const status =
        i < Math.round(scheme.count * 0.25)
          ? STATUS_ORDER[0] // pending
          : i < Math.round(scheme.count * 0.35)
          ? STATUS_ORDER[2] // failed
          : STATUS_ORDER[1]; // submitted
      const created = addDays(new Date(summary.to), -((seed * 13) % 28));
      items.push({
        id: 1000 + seed,
        beneficiaryName: `${pickFrom(FIRST_NAMES, seed)} ${pickFrom(
          LAST_NAMES,
          seed + 3,
        )}`,
        age: String(20 + ((seed * 7) % 30)),
        guardianName: `${pickFrom(FIRST_NAMES, seed + 5)} ${pickFrom(
          LAST_NAMES,
          seed + 1,
        )}`,
        samagraId: String(100000000 + seed * 137),
        mobile: `9${String(100000000 + seed * 91).slice(0, 9)}`,
        address: '—',
        schemeId: scheme.id,
        schemeName: scheme.name,
        schemeCode: scheme.code,
        facilityId: 1,
        facilityName: pickFrom(FACILITIES, seed),
        facilityType: 'PHC',
        status,
        createdAt: created.toISOString(),
        updatedAt: created.toISOString(),
        procedureDate: created.toISOString(),
      });
      if (items.length >= MAX_LIST_ITEMS) {
        break;
      }
    }
    if (items.length >= MAX_LIST_ITEMS) {
      break;
    }
  }

  return {
    items,
    total: summary.total,
  };
};

const STATUS_DISPLAY = {
  PENDING_AUTH: 'Pending',
  AUTH_SUCCESS: 'Auth Success',
  AUTH_FAILED: 'Failed',
  SUBMITTED: 'Submitted',
};

const buildMockExcelDownload = (filters = {}) => {
  const list = buildMockBeneficiaries(filters);

  // Single header row + one row per beneficiary, mirroring the .xlsx
  // produced by the real backend so MOCK_MODE matches the production
  // shape exactly. CSV (with a UTF-8 BOM) keeps Excel happy without
  // shipping a binary .xlsx writer in the JS bundle.
  const header = [
    'S.No.',
    'ID',
    'Name',
    'Age',
    'Father/Husband',
    'Samagra ID',
    'Mobile',
    'Address',
    'Scheme',
    'Scheme Code',
    'Facility',
    'Facility Type',
    'Doctor',
    'Procedure Date',
    'Follow-up Date',
    'Claim ID',
    'Status',
    'Created At',
  ];

  const rows = list.items.map((b, idx) => [
    String(idx + 1),
    String(b.id),
    b.beneficiaryName || '',
    b.age || '',
    b.guardianName || '',
    b.samagraId || '',
    b.mobile || '',
    b.address || '',
    b.schemeName || '',
    b.schemeCode || '',
    b.facilityName || '',
    b.facilityType || '',
    b.doctorName || '',
    b.procedureDate ? toYmd(b.procedureDate) : '',
    b.followUpDate ? toYmd(b.followUpDate) : '',
    b.claimId || '',
    STATUS_DISPLAY[b.status] || b.status || '',
    b.createdAt ? String(b.createdAt).replace('T', ' ').slice(0, 19) : '',
  ]);

  const lines = [header, ...rows];
  const csv =
    '\uFEFF' + lines.map(row => row.map(escapeCsvCell).join(',')).join('\r\n');

  const bytes = utf8Encode(csv);
  const period = filters.period || 'today';
  const fromPart =
    period === 'custom' && filters.from ? toYmd(filters.from) : 'all';
  const toPart =
    period === 'custom' && filters.to ? toYmd(filters.to) : toYmd(new Date());

  const fileName = `my_beneficiaries_${period}_${fromPart}_${toPart}.csv`;

  return {
    base64: bytesToBase64(bytes),
    fileName,
    mimeType: 'text/csv',
  };
};

/* ----------------------------- mock helpers ------------------------------ */

const startOfDay = d => {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
};

const endOfDay = d => {
  const x = new Date(d);
  x.setHours(23, 59, 59, 999);
  return x;
};

const addDays = (d, n) => {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
};

const escapeCsvCell = cell => {
  const s = cell == null ? '' : String(cell);
  if (/[",\r\n]/.test(s)) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
};

/* eslint-disable no-bitwise */
// Minimal UTF-8 encoder so Hindi labels survive the round-trip through
// the data URL on devices without a global TextEncoder.
const utf8Encode = str => {
  const out = [];
  for (let i = 0; i < str.length; i++) {
    let code = str.charCodeAt(i);
    if (code >= 0xd800 && code <= 0xdbff && i + 1 < str.length) {
      const next = str.charCodeAt(i + 1);
      if (next >= 0xdc00 && next <= 0xdfff) {
        code = 0x10000 + ((code - 0xd800) << 10) + (next - 0xdc00);
        i++;
      }
    }
    if (code < 0x80) {
      out.push(code);
    } else if (code < 0x800) {
      out.push(0xc0 | (code >> 6), 0x80 | (code & 0x3f));
    } else if (code < 0x10000) {
      out.push(
        0xe0 | (code >> 12),
        0x80 | ((code >> 6) & 0x3f),
        0x80 | (code & 0x3f),
      );
    } else {
      out.push(
        0xf0 | (code >> 18),
        0x80 | ((code >> 12) & 0x3f),
        0x80 | ((code >> 6) & 0x3f),
        0x80 | (code & 0x3f),
      );
    }
  }
  return Uint8Array.from(out);
};
/* eslint-enable no-bitwise */

const bytesToBase64 = bytes => {
  // Re-use the same byte → base64 routine the real download path uses.
  return arrayBufferToBase64(bytes.buffer);
};
