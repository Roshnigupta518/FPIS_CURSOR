/**
 * Snake_case ↔ camelCase mappers for the network boundary.
 *
 * The backend uses snake_case (beneficiary_name, auth_status, ...).
 * The mobile app uses camelCase everywhere internally. Mapping happens
 * exclusively in the api/ layer so screens never deal with the
 * mismatch.
 *
 * Domain-specific mappers (facility / scheme / beneficiary) live here
 * so they stay near the generic helpers.
 */

import {SCHEMES} from '../constants/schemes';
import {FACILITIES} from '../constants/facilities';

/* -------------------------------------------------------------------------- */
/*  GENERIC HELPERS                                                            */
/* -------------------------------------------------------------------------- */

const snakeToCamel = str =>
  str.replace(/_([a-z0-9])/g, (_, c) => c.toUpperCase());

const camelToSnake = str =>
  str.replace(/([A-Z])/g, '_$1').toLowerCase();

export const objectSnakeToCamel = obj => {
  if (!obj || typeof obj !== 'object') return obj;
  const out = {};
  for (const [k, v] of Object.entries(obj)) out[snakeToCamel(k)] = v;
  return out;
};

export const objectCamelToSnake = obj => {
  if (!obj || typeof obj !== 'object') return obj;
  const out = {};
  for (const [k, v] of Object.entries(obj)) out[camelToSnake(k)] = v;
  return out;
};

/* -------------------------------------------------------------------------- */
/*  FACILITY                                                                   */
/* -------------------------------------------------------------------------- */

/**
 * Server row → app-friendly shape.
 *
 * The server stores facility_type as a lowercase ENUM (chc, ch, …).
 * The app's FacilityCard expects the UPPERCASE type code as a badge.
 */
export const mapFacility = row => {
  if (!row) return null;
  const type = String(row.facility_type || '').toUpperCase();
  const meta = FACILITIES[type] || {};
  return {
    id: row.id,
    type,
    name: row.facility_name,
    nameHi: row.facility_name,          // proper noun — same in both languages
    typeName: meta.name || row.facility_name,
    typeNameHi: meta.nameHi || row.facility_name,
    district: row.district_name,
    preselected: Boolean(row.preselected),
    createdAt: row.created_at,
  };
};

/* -------------------------------------------------------------------------- */
/*  SCHEME                                                                     */
/* -------------------------------------------------------------------------- */

// Map server scheme_code → existing client SCHEMES key so the cards
// keep their bilingual names + descriptions when fetched from the API.
const CODE_TO_KEY = {
  NSV: 'MALE_STERILIZATION',
  FST: 'FEMALE_STERILIZATION',
  ANT: 'ANTARA_INJECTION',
  PPIUCD: 'PPIUCD',
  FPCS: 'COMPENSATION',
};

export const mapScheme = row => {
  if (!row) return null;
  const key = CODE_TO_KEY[row.scheme_code];
  const meta = SCHEMES[key] || {};
  return {
    id: row.id,                                  // numeric server id
    serverId: row.id,
    code: row.scheme_code,
    key: key || row.scheme_code,
    name: meta.name || row.scheme_name,
    nameHi: meta.nameHi || row.scheme_name,
    description: meta.description || '',
    descriptionHi: meta.descriptionHi || '',
    allowedFacilityTypes: (row.allowed_facility_types || '')
      .split(',')
      .map(s => s.trim())
      .filter(Boolean),
  };
};

/* -------------------------------------------------------------------------- */
/*  BENEFICIARY                                                                */
/* -------------------------------------------------------------------------- */

/**
 * Server row → app row.
 *
 * Mapping is hand-rolled (not auto snake→camel) because we also rename
 * a couple of fields (father_husband_name → guardianName, auth_status
 * → status) to match the names the existing screens already use.
 */
export const mapBeneficiary = row => {
  if (!row) return null;
  return {
    id: row.id,
    beneficiaryName: row.beneficiary_name,
    age: row.age != null ? String(row.age) : '',
    guardianName: row.father_husband_name,
    samagraId: row.samagra_id,
    mobile: row.mobile || '',
    address: row.address || '',
    schemeId: row.scheme_id,
    schemeName: row.scheme_name,
    schemeCode: row.scheme_code,
    facilityId: row.facility_id,
    facilityName: row.facility_name,
    facilityType: String(row.facility_type || '').toUpperCase(),
    doctorName: row.doctor_name,
    procedureDate: row.procedure_date,
    followUpDate: row.follow_up_date,
    claimId: row.claim_id || '',
    status: row.auth_status,                     // reused by StatusBadge
    faceAuthImage: row.face_auth_image || null,
    createdBy: row.created_by,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
};

/**
 * App form values → server payload.
 *
 * Strips empty strings (so the backend treats them as NULL instead of
 * failing regex validation), normalizes the date fields, and renames
 * the few keys that diverge from straight snake_case.
 */
// export const beneficiaryToServer = (form, extras = {}) => {
//   const toDate = v => {
//     if (!v) return null;
//     const d = v instanceof Date ? v : new Date(v);
//     if (Number.isNaN(d.getTime())) return null;
//     return d.toISOString().slice(0, 10);         // YYYY-MM-DD
//   };

//   const clean = v => (v === '' || v === undefined ? null : v);

//   return {
//     beneficiary_name:    form.beneficiaryName,
//     age:                 form.age ? Number(form.age) : undefined,
//     father_husband_name: form.guardianName,
//     samagra_id:          form.samagraId,
//     mobile:              clean(form.mobile),
//     address:             clean(form.address),
//     scheme_id:           Number(form.schemeId ?? extras.schemeId),
//     facility_id:         Number(form.facilityId ?? extras.facilityId),
//     doctor_name:         form.doctorName,
//     procedure_date:      toDate(form.procedureDate),
//     follow_up_date:      toDate(form.followUpDate),
//     claim_id:            clean(form.claimId),
//     referenceKey : form.referenceKey,                              // null when auth failed
//     transaction_id: form.transaction_id,
//   };
// };


export const beneficiaryToServer = (form, extras = {}) => {
  const toIso = v => {
    if (!v) return null;
    const d = v instanceof Date ? v : new Date(v);
    if (Number.isNaN(d.getTime())) return null;
    return d.toISOString();                       // 2026-06-04T07:08:20.990Z
  };
  const clean = v => (v === '' || v === undefined ? null : v);
  return {
    beneficiary_name:    form.beneficiaryName,
    age:                 form.age ? Number(form.age) : 0,
    father_husband_name: form.guardianName,
    samagra_id:          form.samagraId,
    mobile:              clean(form.mobile),
    address:             clean(form.address),
    scheme_id:           Number(form.schemeId       ?? extras.schemeId       ?? 0),
    facility_id:         Number(form.facilityId     ?? extras.facilityId     ?? 0),
    facility_type_id:    Number(form.facilityTypeId ?? extras.facilityTypeId ?? 0),
    doctor_name:         form.doctorName,
    procedure_date:      toIso(form.procedureDate),
    follow_up_date:      toIso(form.followUpDate),
    claim_id:            clean(form.claimId),
    auth_status: '',
    face_auth_image:     '',  // face-auth screen later
    reference_key:       clean(form.referenceKey),
    transaction_id:      clean(form.transactionId),
    transaction_Code:      clean(form.transactionCode),
  };
};