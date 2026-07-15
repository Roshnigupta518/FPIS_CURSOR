# Request to MP Parichai Auth SDK Team — SAST Finding

**To:** MP Parichai Auth SDK Team
**From:** NHM Madhya Pradesh — FamilyWelfareApp Development Team
**Subject:** SAST vulnerability in `parichai-auth-sdk-release.aar` — Hardcoded `DEFAULT_ENC_DATA` in `AuthRepository`
**Priority:** High — pending NHM security audit closure

---

## 1. Background

FamilyWelfareApp (`com.familywelfareapp`) integrates the MP Parichai Aadhaar
Auth SDK via `parichai-auth-sdk-release.aar` for beneficiary Aadhaar
verification. The app was recently audited by Pyramid Cyber Security &
Forensic Pvt. Ltd. as part of the NHM Android application SAST exercise
(report dated July 2026).

## 2. Finding

The SAST report flagged the following High-severity item **inside the
SDK's AAR binary**, not in application-owned code:

- **Class:** `AuthRepository` (compiled to `AuthRepository.smali`)
- **Package:** `com.gov.mpparichai.auth.core.*`
- **Field:** `DEFAULT_ENC_DATA` — hardcoded Base64-encoded encrypted payload
- **CWE:** CWE-798 — Use of Hard-coded Credentials
- **CVSS:** 7.7 (High)

Because the field is embedded in the shipped AAR, application teams cannot
remove or rotate it. It is currently the single blocking finding for the
audit's HIGH bucket that the application team cannot remediate on their own.

## 3. Application-side mitigation already in place

The FamilyWelfareApp build has been hardened so that the vendor default can
never be reached from user flows:

- Every call to `ParichaiAuth.login()` supplies a fresh `encData` returned
  by the backend `/AadhaarGateway/PrepareRequest` endpoint for that
  specific transaction (see `src/screens/BeneficiaryForm/index.js` and
  `src/api/AadhaarGatewayService.js`).
- The native bridge `ParichaiAuthModule.kt` now validates that `encData` is
  non-blank, does not contain placeholder tokens (`default_enc_data`,
  `sample`, `dummy`, `placeholder`, `test_enc_data`), and is at least 64
  characters long before invoking the SDK. Any short-circuit that would
  cause the SDK to fall back to its default is rejected upstream with an
  `INVALID_INPUT` error.

These mitigations mean the hardcoded value is unreachable at runtime, but
static analysis tools still flag its presence in the binary.

## 4. Requested changes to the SDK

Please issue an updated `parichai-auth-sdk-release.aar` that either:

**Option A (preferred).** Removes the `DEFAULT_ENC_DATA` field entirely and
requires callers to supply `encData`, throwing a fail-fast exception when
it is missing.

**Option B.** Replaces the hardcoded value with a runtime-derived secret
using the Android Keystore. Specifically:

1. Generate an `AES/GCM/NoPadding` key at first launch using
   `KeyGenParameterSpec` with `setUserAuthenticationRequired(false)` and
   `setInvalidatedByBiometricEnrollment(false)` so the SDK works
   headlessly.
2. Store the key alias in the AndroidKeyStore provider (never on disk,
   never as a source-code constant).
3. Encrypt the default payload with that key and decrypt it just-in-time
   inside `AuthRepository`.
4. Ensure the class does not expose the default field via reflection or
   public getters.

Additionally, please:

- Apply ProGuard/R8 name-obfuscation to internal fields such as
  `DEFAULT_ENC_DATA` so the field is not trivially discoverable in the
  smali output of the shipped AAR.
- Publish the updated AAR with a version bump and a short changelog
  entry so the audit can be closed on our side.

## 5. Timeline

The NHM audit closure meeting is scheduled for **[insert date]**. We would
appreciate an updated AAR (even a preview build) by **[insert date - 7
days]** so we can regression-test our Aadhaar flows and share fresh
scan results with the auditor.

## 6. Contact

- Primary: Dr. Prakhar Singh, Deputy Director — IT, NHM MP
  <ddit.nhm@mp.gov.in> · +91 8989928630
- Application development lead: **[insert name and email]**

---

*Attachment: MPNHM SAST Report.pdf — see pages 9–11 for the exact
AuthRepository / DEFAULT_ENC_DATA excerpt.*
