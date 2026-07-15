/**
 * Safe logger.
 *
 * NHM SAST context (CWE-532 — Insertion of Sensitive Information into Log File):
 *   The auditors flagged `SafeNetworkLogInterceptor.smali` inside the Parichai
 *   AAR for writing sensitive data to `android.util.Log`. The equivalent risk
 *   on the JS side is scattered `console.log(...)` calls that dump tokens,
 *   passwords, Aadhaar transaction blobs, uidTokens, refKeys, and beneficiary
 *   records. Logcat is world-readable on rooted devices and shows up in bug
 *   reports, so these logs must not survive into a release build.
 *
 * This module provides a drop-in replacement for `console.*` that:
 *   1. Is a total no-op when `__DEV__ === false` (i.e. release APK).
 *   2. Automatically redacts common sensitive keys before printing, so even
 *      during development we don't accidentally paste Aadhaar payloads into
 *      Slack / screenshots.
 *   3. Redacts recursively through nested objects and arrays.
 *
 * Usage:
 *   import {logger} from '../utils/logger';
 *   logger.log('Login response', response);
 *   logger.error('Parichai SDK failed', err);
 */

const SENSITIVE_KEY_PATTERNS = [
  /pass(word)?/i,
  /token/i,
  /refresh/i,
  /authorization/i,
  /cookie/i,
  /secret/i,
  /api[_-]?key/i,
  /encdata/i,
  /enc_data/i,
  /transactionid/i,
  /transaction_id/i,
  /uidtoken/i,
  /uid_token/i,
  /refkey/i,
  /ref_key/i,
  /aadhaar/i,
  /aadhar/i,
  /otp/i,
  /pin/i,
  /fcm[_-]?token/i,
];

const REDACTED = '***REDACTED***';
const MAX_DEPTH = 6;

const isSensitiveKey = key =>
  typeof key === 'string' && SENSITIVE_KEY_PATTERNS.some(re => re.test(key));

const maskValue = (value, depth = 0) => {
  if (value === null || value === undefined) return value;
  if (depth > MAX_DEPTH) return '[deep-object]';

  if (Array.isArray(value)) {
    return value.map(v => maskValue(v, depth + 1));
  }

  if (typeof value === 'object') {
    const out = {};
    for (const [k, v] of Object.entries(value)) {
      out[k] = isSensitiveKey(k) ? REDACTED : maskValue(v, depth + 1);
    }
    return out;
  }

  return value;
};

const maskArgs = args => args.map(a => maskValue(a));

const noop = () => {};

const buildLogger = () => {
  if (!__DEV__) {
    return {
      log: noop,
      info: noop,
      debug: noop,
      warn: noop,
      error: noop,
    };
  }

  return {
    log: (...args) => console.log(...maskArgs(args)),
    info: (...args) => console.info(...maskArgs(args)),
    debug: (...args) => console.debug(...maskArgs(args)),
    // warn / error keep the original arg shapes so React Native's redbox and
    // Sentry-style crash reporters still see meaningful stack traces. We
    // still mask any object arguments though.
    warn: (...args) => console.warn(...maskArgs(args)),
    error: (...args) => console.error(...maskArgs(args)),
  };
};

export const logger = buildLogger();

export const __testables = {
  isSensitiveKey,
  maskValue,
  SENSITIVE_KEY_PATTERNS,
  REDACTED,
};
