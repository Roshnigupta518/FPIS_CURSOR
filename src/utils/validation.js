/**
 * Centralized validation registry.
 *
 * RegexType - shared regex catalog (extend here, use everywhere)
 * validateField - runs the rule for a single field config
 * validateForm  - runs every field config against a values object,
 *                 returning an { errors, isValid } pair.
 *
 * Returned error values are *translation keys* — the consuming screen
 * passes them through t() so the UI stays bilingual.
 */

/* -------------------------------------------------------------------------- */
/*  REGEX CATALOG                                                              */
/* -------------------------------------------------------------------------- */

export const RegexType = {
  // Accepts Hindi (Devanagari U+0900-U+097F) and English letters + spaces.
  NAME: /^[A-Za-z\u0900-\u097F\s.'-]{2,60}$/,

  // Age 1 - 120
  AGE: /^(?:[1-9]|[1-9][0-9]|1[01][0-9]|120)$/,

  // Samagra ID is a 9-digit numeric identifier issued in MP.
  SAMAGRA_ID: /^[0-9]{9}$/,

  // Indian mobile starts with 6-9, 10 digits total.
  MOBILE: /^[6-9][0-9]{9}$/,

  // Free text - accepts Hindi/English/numbers and common punctuation.
  TEXT: /^[A-Za-z0-9\u0900-\u097F\s.,/\-()]{1,200}$/,

  // Address allows newlines too.
  ADDRESS: /^[A-Za-z0-9\u0900-\u097F\s.,/\-()\n]{3,200}$/,

  // Claim IDs are typically alphanumeric, 4-20 chars.
  CLAIM_ID: /^[A-Za-z0-9-]{4,20}$/,

  // Generic numeric.
  NUMBER: /^[0-9]+$/,

  // Username: 4-30 alphanumeric + dot/underscore/hyphen.
  USERNAME: /^[A-Za-z0-9._-]{4,30}$/,

  // Password: min 6 chars (kept lax for placeholder API).
  PASSWORD: /^.{6,}$/,
};

/* -------------------------------------------------------------------------- */
/*  ERROR KEY MAP                                                              */
/* -------------------------------------------------------------------------- */

const ERROR_KEY_BY_REGEX = {
  NAME: 'ERR_INVALID_NAME',
  AGE: 'ERR_INVALID_AGE',
  SAMAGRA_ID: 'ERR_INVALID_SAMAGRA',
  MOBILE: 'ERR_INVALID_MOBILE',
  TEXT: 'ERR_INVALID_TEXT',
  ADDRESS: 'ERR_INVALID_TEXT',
  CLAIM_ID: 'ERR_INVALID_CLAIM',
  NUMBER: 'ERR_INVALID_TEXT',
  USERNAME: 'ERR_INVALID_TEXT',
  PASSWORD: 'ERR_INVALID_TEXT',
};

/* -------------------------------------------------------------------------- */
/*  PUBLIC API                                                                 */
/* -------------------------------------------------------------------------- */

/**
 * Validate a single field config + value.
 * Returns null when valid, otherwise a translation key string.
 */
export const validateField = (fieldConfig, value) => {
  if (!fieldConfig) return null;

  const isEmpty =
    value === undefined ||
    value === null ||
    (typeof value === 'string' && value.trim() === '');

  if (fieldConfig.required && isEmpty) {
    return 'ERR_REQUIRED';
  }

  // Skip regex when optional + empty.
  if (!fieldConfig.required && isEmpty) {
    return null;
  }

  // Date fields rely on the picker producing a Date instance.
  if (fieldConfig.type === 'date') {
    if (!(value instanceof Date) && !Date.parse(value)) {
      return 'ERR_REQUIRED';
    }
    return null;
  }

  if (fieldConfig.regex) {
    const regex = RegexType[fieldConfig.regex];
    if (regex && !regex.test(String(value))) {
      return ERROR_KEY_BY_REGEX[fieldConfig.regex] || 'ERR_INVALID_TEXT';
    }
  }

  return null;
};

/**
 * Validate a whole form against an array of field configs.
 * Returns { errors: Record<key, errorKey>, isValid: boolean }.
 */
export const validateForm = (fields, values) => {
  const errors = {};
  fields.forEach(f => {
    const err = validateField(f, values[f.key]);
    if (err) errors[f.key] = err;
  });
  return {errors, isValid: Object.keys(errors).length === 0};
};
