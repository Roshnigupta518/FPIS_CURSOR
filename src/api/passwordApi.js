/**
 * Password reset API.
 *
 *   requestPasswordOtpApi({userId})
 *     → Promise<{maskedMobile, expiresInSec}>
 *
 *   verifyPasswordOtpApi({userId, otp})
 *     → Promise<{resetToken}>
 *
 *   resetPasswordApi({userId, resetToken, newPassword})
 *     → Promise<{success: true}>
 *
 *  Three-step "forgot password" flow:
 *    1. User enters their User ID. Backend looks them up and texts a
 *       6-digit OTP to the mobile on file. We get back a masked version
 *       of that mobile + the OTP TTL so the UI can show "OTP sent to
 *       98****3210" plus a resend countdown.
 *    2. User keys in the OTP. Backend issues a short-lived reset token
 *       (do *not* trust the client to remember "I verified the OTP").
 *    3. User picks a new password. Backend validates the reset token and
 *       writes the new bcrypt hash, invalidating any prior token.
 *
 *  Backend contract (proposed):
 *    POST /api/auth/forgot-password/request-otp  { userId }
 *    POST /api/auth/forgot-password/verify-otp   { userId, otp }
 *    POST /api/auth/forgot-password/reset        { userId, resetToken, newPassword }
 *
 *  ── MOCK MODE ──
 *  Flip MOCK_MODE to false once the backend ships these endpoints.
 *  While true:
 *    - any userId with ≥ 3 chars is treated as valid; "0" rejects so
 *      the "user not found" path can also be tested,
 *    - the magic OTP is `123456` — anything else fails verification,
 *    - resetPassword always succeeds.
 */

import {request} from './axiosInstance';
import {ENDPOINTS} from '../constants/api';

const MOCK_MODE = true;

/* -------------------------------------------------------------------------- */
/*  Mock helpers                                                              */
/* -------------------------------------------------------------------------- */

const wait = ms => new Promise(resolve => setTimeout(resolve, ms));

const buildMockMaskedMobile = userId => {
  // Deterministic "fake" mobile derived from the userId hash so the
  // resend OTP / verify-OTP screens see the same number every time.
  let hash = 0;
  for (let i = 0; i < userId.length; i++) {
    // eslint-disable-next-line no-bitwise
    hash = (hash * 31 + userId.charCodeAt(i)) >>> 0;
  }
  const tail = String(1000 + (hash % 9000));
  const head = String(60 + (hash % 30)); // any 6X / 7X / 8X / 9X prefix
  return `${head}******${tail}`;
};

const makeError = (status, message) => {
  const err = new Error(message);
  err.status = status;
  return err;
};

/* -------------------------------------------------------------------------- */
/*  Step 1 — request OTP                                                       */
/* -------------------------------------------------------------------------- */

export const requestPasswordOtpApi = async ({userId} = {}) => {
  if (!userId || String(userId).trim().length < 3) {
    throw makeError(422, 'Invalid User ID');
  }

  if (MOCK_MODE) {
    await wait(700);
    // "0" simulates "user not found" so the screen's error state is
    // exercisable without a real backend.
    if (String(userId).trim() === '0') {
      throw makeError(404, 'User not found');
    }
    return {
      maskedMobile: buildMockMaskedMobile(String(userId).trim()),
      expiresInSec: 300,
    };
  }

  const {data} = await request({
    method: 'POST',
    url: ENDPOINTS.AUTH.FORGOT_PASSWORD_REQUEST_OTP,
    data: {userId: String(userId).trim()},
  });

  return {
    maskedMobile: data?.maskedMobile || '',
    expiresInSec: Number(data?.expiresInSec || 300),
  };
};

/* -------------------------------------------------------------------------- */
/*  Step 2 — verify OTP                                                        */
/* -------------------------------------------------------------------------- */

export const verifyPasswordOtpApi = async ({userId, otp} = {}) => {
  if (!userId || !otp || String(otp).length !== 6) {
    throw makeError(422, 'Invalid OTP');
  }

  if (MOCK_MODE) {
    await wait(600);
    if (String(otp) !== '123456') {
      throw makeError(401, 'Incorrect OTP. Try 123456 in mock mode.');
    }
    return {resetToken: `mock-reset-${Date.now()}`};
  }

  const {data} = await request({
    method: 'POST',
    url: ENDPOINTS.AUTH.FORGOT_PASSWORD_VERIFY_OTP,
    data: {userId: String(userId).trim(), otp: String(otp)},
  });

  if (!data?.resetToken) {
    throw makeError(500, 'OTP verified but reset token missing');
  }
  return {resetToken: String(data.resetToken)};
};

/* -------------------------------------------------------------------------- */
/*  Step 3 — reset password                                                    */
/* -------------------------------------------------------------------------- */

export const resetPasswordApi = async ({
  userId,
  resetToken,
  newPassword,
} = {}) => {
  if (!userId || !resetToken || !newPassword) {
    throw makeError(422, 'Missing required fields');
  }

  if (MOCK_MODE) {
    await wait(700);
    return {success: true};
  }

  await request({
    method: 'POST',
    url: ENDPOINTS.AUTH.FORGOT_PASSWORD_RESET,
    data: {
      userId: String(userId).trim(),
      resetToken: String(resetToken),
      newPassword: String(newPassword),
    },
  });

  return {success: true};
};
