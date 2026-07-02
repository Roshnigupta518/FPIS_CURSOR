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

import apiClient from './axiosInstance';
import {ENDPOINTS} from '../constants/api';
import {mapBeneficiary} from '../utils/mappers';

const MOCK_MODE = false;

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

/* -------------------------------------------------------------------------- */
/*  Period → backend `flag`                                                    */
/* -------------------------------------------------------------------------- */
//
// The deployed backend (FPIS_API_APP) takes an integer `flag` for the
// time window instead of a string period. Mapping confirmed by backend:
//
//   1 → today
//   2 → last 7 days (this week)
//   3 → last 30 days (this month)
//   4 → custom (sends fromDate / toDate as YYYY-MM-DD)
//   5 → all
//
const PERIOD_TO_FLAG = {
  today: 1,
  week: 2,
  month: 3,
  custom: 4,
  all: 5,
};

/**
 * Builds the query string the deployed API expects:
 *
 *   /api/reports/my-summary?flag=2&userId=42
 *   /api/reports/my-summary?flag=5&userId=42&fromDate=2025-01-01&toDate=2025-01-31
 *   /api/reports/my-summary?flag=2&userId=42&schemeId=3
 *
 * `fromDate` / `toDate` are only sent when period === 'custom' (Swagger
 * marks them optional); both go in the canonical `YYYY-MM-DD` shape so
 * SQL Server parses them deterministically regardless of locale.
 */
const buildSummaryParams = ({period, from, to, schemeId, userId} = {}) => {
  const params = {};
  params.flag = PERIOD_TO_FLAG[period || 'today'] ?? PERIOD_TO_FLAG.today;
  if (userId != null && userId !== '') {
    params.userId = Number(userId);
  }
  if ((period || 'today') === 'custom') {
    if (from) {
      params.fromDate = toYmd(from);
    }
    if (to) {
      params.toDate = toYmd(to);
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

  const response = await apiClient({
    method: 'GET',
    url: ENDPOINTS.REPORTS.MY_SUMMARY,
    params: buildSummaryParams(filters),
  });

  return normalizeSummaryResponse(response?.data, filters);
};

/**
 * The deployed backend returns the scheme breakdown directly — it can
 * be a bare array of `{id, code, name, count}` rows, a `{DataTabN: [...] }`
 * wrapper (legacy .NET WebMethod style), or our own `{success, data, meta}`
 * envelope. Handle all three so a server-side change of shape doesn't
 * silently blank out the screen.
 */
const normalizeSummaryResponse = (raw, filters = {}) => {
  let schemeRows = [];
  let statusRows = null;
  let totalFromApi = null;

  if (Array.isArray(raw)) {
    schemeRows = raw;
  } else if (raw && typeof raw === 'object') {
    if (Array.isArray(raw.data)) {
      // `{ success, data, meta }` envelope.
      schemeRows = raw.data;
    } else if (raw.data && Array.isArray(raw.data.byScheme)) {
      // `{ data: { byScheme, byStatus, total } }` envelope.
      schemeRows = raw.data.byScheme;
      statusRows = raw.data.byStatus || null;
      if (typeof raw.data.total === 'number') {
        totalFromApi = raw.data.total;
      }
    } else if (Array.isArray(raw.DataTab1) || Array.isArray(raw.dataTab1)) {
      // .NET-style multi-recordset response.
      schemeRows = raw.DataTab1 || raw.dataTab1;
      const tab2 = raw.DataTab2 || raw.dataTab2;
      if (Array.isArray(tab2)) {
        statusRows = tab2;
      }
    } else if (Array.isArray(raw.byScheme)) {
      schemeRows = raw.byScheme;
      statusRows = raw.byStatus || null;
      if (typeof raw.total === 'number') {
        totalFromApi = raw.total;
      }
    }
  }

  const byScheme = (Array.isArray(schemeRows) ? schemeRows : []).map(s => ({
    id: s.id ?? s.scheme_id ?? s.schemeId ?? null,
    code: s.code ?? s.scheme_code ?? s.schemeCode ?? '',
    name: s.name ?? s.scheme_name ?? s.schemeName ?? '',
    count: Number(s.count ?? s.total ?? 0),
  }));

  const computedTotal = byScheme.reduce((sum, r) => sum + (r.count || 0), 0);

  // byStatus when the backend doesn't ship it: surface zeroes so the
  // commented-out KPI grid (or anything else that reads byStatus) keeps
  // the keys it expects.
  const byStatus = pickStatusBreakdown(statusRows);

  return {
    period: filters.period || 'today',
    from: filters.from ? toYmd(filters.from) : null,
    to: filters.to ? toYmd(filters.to) : null,
    schemeId: filters.schemeId ?? null,
    total: totalFromApi ?? computedTotal,
    byStatus,
    byScheme,
  };
};

const STATUS_KEYS = [
  'PENDING_AUTH',
  'AUTH_SUCCESS',
  'AUTH_FAILED',
  'SUBMITTED',
];

const pickStatusBreakdown = rows => {
  const empty = {
    PENDING_AUTH: 0,
    AUTH_SUCCESS: 0,
    AUTH_FAILED: 0,
    SUBMITTED: 0,
  };
  if (!rows) {
    return empty;
  }
  // Backend may send either a keyed object or an array of `{status, count}`.
  if (Array.isArray(rows)) {
    return rows.reduce(
      (acc, r) => {
        const key = String(r.status || r.code || r.name || '').toUpperCase();
        if (STATUS_KEYS.includes(key)) {
          acc[key] = Number(r.count || 0);
        }
        return acc;
      },
      {...empty},
    );
  }
  if (typeof rows === 'object') {
    return STATUS_KEYS.reduce((acc, key) => {
      acc[key] = Number(rows[key] || 0);
      return acc;
    }, {});
  }
  return empty;
};

/* -------------------------------------------------------------------------- */
/*  Beneficiary list                                                           */
/* -------------------------------------------------------------------------- */

/**
 * Returns the user's own beneficiaries that match the current report
 * filters. In MOCK_MODE we synthesize a deterministic list whose scheme
 * + status distribution mirrors `buildMockSummary` so the screen looks
 * coherent. In real mode we hit `/reports/my-beneficiaries` with the
 * same `flag` / `userId` / `fromDate` / `toDate` / `schemeId` query
 * the summary endpoint takes — the backend scopes the rows to
 * `created_by = userId` server-side.
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

  const response = await apiClient({
    method: 'GET',
    url: ENDPOINTS.REPORTS.MY_BENEFICIARIES,
    params,
  });

  // The deployed API may return either a bare array, an envelope, or
  // a `{DataTab1: [...]}` wrapper — match the summary parser's tolerance.
  const raw = response?.data;
  let rows = [];
  let total = null;
  if (Array.isArray(raw)) {
    rows = raw;
  } else if (raw && typeof raw === 'object') {
    if (Array.isArray(raw.data)) {
      rows = raw.data;
      total = raw.meta?.total ?? null;
    } else if (Array.isArray(raw.DataTab1) || Array.isArray(raw.dataTab1)) {
      rows = raw.DataTab1 || raw.dataTab1;
      total = raw.totalRecords ?? raw.total ?? null;
    } else if (Array.isArray(raw.items)) {
      rows = raw.items;
      total = raw.total ?? null;
    }
  }

  // Normalize key-casing before the shared mapBeneficiary mapper picks
  // them up — the deployed backend currently returns a *minimal* row
  // shape with PascalCase `Id` (rest of the fields stay lowercase /
  // snake_case). Without this, every card would show `ID: undefined`
  // and tapping a card would navigate to BeneficiaryDetails(undefined).
  return {
    items: rows.map(r => mapBeneficiary(normalizeReportRow(r))),
    total: total ?? rows.length,
  };
};

/**
 * Aliases every key-casing variant the My Report endpoint may emit so a
 * single call to `mapBeneficiary` can handle them. The deployed backend
 * mixes three styles in one row — PascalCase (`Id`, `Age`, `Mobile`),
 * compound-PascalCase (`FatherHusbandName`, `SamagraID`, `Scheme_Code`),
 * and plain snake_case (`beneficiary_name`, `scheme_name`) — so we
 * remap all of them here.
 *
 * Critically we also coerce `id` to a Number: the list endpoint returns
 * it as a string ("62"), but the by-id endpoint returns a number (62),
 * and `BeneficiaryDetails` matches them with `===`. Without this fix
 * the strict equality fails and the details screen falls back to the
 * (empty) list cache and renders "No data".
 */
const normalizeReportRow = row => {
  if (!row || typeof row !== 'object') {
    return row;
  }
  const rawId = row.id ?? row.Id ?? row.ID ?? null;
  const parsedId =
    rawId == null || rawId === ''
      ? null
      : Number.isFinite(Number(rawId))
      ? Number(rawId)
      : rawId;

  return {
    ...row,
    id: parsedId,
    beneficiary_name:
      row.beneficiary_name ?? row.beneficiaryName ?? row.Name ?? row.name ?? '',
    age: row.age ?? row.Age ?? '',
    father_husband_name:
      row.father_husband_name ??
      row.FatherHusbandName ??
      row.guardianName ??
      row.fatherHusbandName ??
      '',
    samagra_id:
      row.samagra_id ?? row.SamagraID ?? row.SamagraId ?? row.samagraId ?? '',
    mobile: row.mobile ?? row.Mobile ?? '',
    address: row.address ?? row.Address ?? '',
    scheme_id: row.scheme_id ?? row.SchemeId ?? row.schemeId ?? null,
    scheme_name: row.scheme_name ?? row.schemeName ?? '',
    scheme_code:
      row.scheme_code ??
      row.Scheme_Code ??
      row.SchemeCode ??
      row.schemeCode ??
      '',
    facility_id: row.facility_id ?? row.FacilityId ?? row.facilityId ?? null,
    facility_name: row.facility_name ?? row.facilityName ?? '',
    facility_type: row.facility_type ?? row.facilityType ?? '',
    doctor_name: row.doctor_name ?? row.DoctorName ?? row.doctorName ?? null,
    procedure_date: row.procedure_date ?? row.procedureDate ?? null,
    follow_up_date: row.follow_up_date ?? row.followUpDate ?? null,
    claim_id: row.claim_id ?? row.ClaimId ?? row.claimId ?? '',
    auth_status: row.auth_status ?? row.authStatus ?? row.status ?? '',
    face_auth_image:
      row.face_auth_image ?? row.FaceAuthImage ?? row.faceAuthImage ?? null,
    created_by: row.created_by ?? row.CreatedBy ?? row.createdBy ?? null,
    created_at: row.created_at ?? row.createdAt ?? null,
    updated_at: row.updated_at ?? row.updatedAt ?? null,
  };
};

/* -------------------------------------------------------------------------- */
/*  Excel download                                                             */
/* -------------------------------------------------------------------------- */

/**
 * Downloads the Excel report as a base64 string + suggested filename.
 *
 * We build the file *client-side* from the same beneficiary rows the
 * list endpoint already returns. That deliberately sidesteps the
 * binary `/reports/my-summary/export` endpoint, which isn't always
 * reachable on every backend deployment — the user-facing download
 * keeps working as long as `/reports/my-beneficiaries` does.
 *
 * We emit CSV with a UTF-8 BOM rather than a real .xlsx because:
 *   • Excel / Numbers / Google Sheets all open it natively
 *   • Hindi text round-trips correctly thanks to the BOM
 *   • No native xlsx writer needs to ship in the JS bundle
 *
 * The base64 + filename + mime type returned here are consumed by
 * `saveBase64ToDevice` on the screen, which lands the file in the
 * Android Downloads folder (or iOS Documents, exposed via Files app).
 */
export const downloadMyReportExcelApi = async (filters = {}) => {
  if (MOCK_MODE) {
    await new Promise(resolve => setTimeout(resolve, 600));
    return buildMockExcelDownload(filters);
  }

  // Pull the *full* beneficiary list (no pagination) — the export
  // should reflect every row that matches the active filters, not
  // just the first page the user has scrolled to.
  const list = await getMyReportBeneficiariesApi({
    ...filters,
    page: 1,
    limit: 10000,
  });

  return buildBeneficiariesCsv(list.items || [], filters);
};

/**
 * Builds a CSV blob from already-mapped beneficiary objects (output
 * of `mapBeneficiary`). Shared between the real download path and
 * the mock builder so the column layout, formatting, and filename
 * convention stay identical.
 */
const buildBeneficiariesCsv = (items, filters = {}) => {
  const header = [
    'S.No.',
    'ID',
    'Name of beneficiary',
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
    'Created Date',
  ];

  const rows = items.map((b, idx) => [
    String(idx + 1),
    b.id != null ? String(b.id) : '',
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
    formatCsvDate(b.procedureDate),
    formatCsvDate(b.followUpDate),
    b.claimId || '',
    formatCsvDate(b.createdAt),
  ]);

  const lines = [header, ...rows];
  const csv =
    '\uFEFF' + lines.map(row => row.map(escapeCsvCell).join(',')).join('\r\n');

  const period = filters.period || 'today';
  const fromPart =
    period === 'custom' && filters.from ? toYmd(filters.from) : 'all';
  const toPart =
    period === 'custom' && filters.to ? toYmd(filters.to) : toYmd(new Date());
  const fileName = `my_beneficiaries_${period}_${fromPart}_${toPart}.csv`;

  return {
    base64: bytesToBase64(utf8Encode(csv)),
    fileName,
    mimeType: 'text/csv',
  };
};

/**
 * Formats a date for the Excel/CSV output as `DD/MM/YYYY`.
 *
 * Two reasons we deliberately drop the time portion and emit just the
 * day:
 *   1. CSVs don't carry column widths, so Excel's default column is
 *      barely wide enough for the date itself — a full timestamp like
 *      "2026-06-10 16:54:29" overflows and Excel renders `####` until
 *      the user widens the column. Date-only fits comfortably.
 *   2. The backend returns dates in two different shapes — ISO
 *      ("2026-06-10T11:24:29.000Z") from `/by-id` and US-style
 *      ("06/10/2026 11:24:29") from `/my-beneficiaries`. We normalize
 *      both to the same `DD/MM/YYYY` for the report.
 */
const formatCsvDate = value => {
  if (value == null || value === '') {
    return '';
  }
  const d = parseFlexibleDate(value);
  if (!d || Number.isNaN(d.getTime())) {
    return '';
  }
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const yyyy = String(d.getFullYear());
  return `${dd}/${mm}/${yyyy}`;
};

/**
 * Parses a date from any of the shapes the backend currently emits:
 *   - ISO 8601:           "2026-06-10T11:24:29.000Z"
 *   - US-formatted:       "06/10/2026 11:24:29"   (MM/DD/YYYY)
 *   - JS Date instance
 * Returns null if it can't recover a valid date.
 */
const parseFlexibleDate = value => {
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value;
  }
  const str = String(value).trim();
  // MM/DD/YYYY [HH:mm:ss] — Hermes' Date constructor isn't reliable
  // on this format, so we parse it explicitly.
  const usMatch =
    /^(\d{1,2})\/(\d{1,2})\/(\d{4})(?:[ T](\d{1,2}):(\d{2})(?::(\d{2}))?)?/.exec(
      str,
    );
  if (usMatch) {
    const [, mm, dd, yyyy, hh = '0', mi = '0', ss = '0'] = usMatch;
    const d = new Date(
      Number(yyyy),
      Number(mm) - 1,
      Number(dd),
      Number(hh),
      Number(mi),
      Number(ss),
    );
    return Number.isNaN(d.getTime()) ? null : d;
  }
  const fallback = new Date(str);
  return Number.isNaN(fallback.getTime()) ? null : fallback;
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

const buildMockExcelDownload = (filters = {}) => {
  const list = buildMockBeneficiaries(filters);
  return buildBeneficiariesCsv(list.items, filters);
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
