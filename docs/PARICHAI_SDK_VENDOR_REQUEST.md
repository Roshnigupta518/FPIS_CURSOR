# Request to MP Parichai Auth SDK Team — SAST Findings

**To:** MP Parichai Auth SDK Team
**From:** NHM Madhya Pradesh — FamilyWelfareApp Development Team
**Subject:** SAST vulnerabilities in `parichai-auth-sdk-release.aar` — hardcoded
`DEFAULT_ENC_DATA` in `AuthRepository`, hardcoded `parichai_auth_key` in
`CryptoUtil`, and unmasked debug logging in `SafeNetworkLogInterceptor`
**Priority:** High — pending NHM security audit closure

---

## 1. Background

FamilyWelfareApp (`com.familywelfareapp`) integrates the MP Parichai Aadhaar
Auth SDK via `parichai-auth-sdk-release.aar` for beneficiary Aadhaar
verification. The app was recently audited by Pyramid Cyber Security &
Forensic Pvt. Ltd. as part of the NHM Android application SAST exercise
(report dated July 2026).

## 2. Findings

The SAST report flagged **three** items **inside the SDK's AAR binary**,
not in application-owned code:

### 2.1 Hardcoded Default Encrypted Authentication Payload — HIGH (CVSS 7.7)
- **Class:** `AuthRepository` (compiled to `AuthRepository.smali`)
- **Package:** `com.gov.mpparichai.auth.core.*`
- **Field:** `DEFAULT_ENC_DATA` — hardcoded Base64-encoded encrypted payload
- **CWE:** CWE-798 — Use of Hard-coded Credentials

### 2.2 Hardcoded Encryption Key alias — MEDIUM (CVSS 5.1)
- **Class:** `CryptoUtil` (compiled to `CryptoUtil.smali`)
- **Package:** `com.gov.mpparichai.auth.core.*` (security sub-package)
- **Field:** static key alias `"parichai_auth_key"`
- **Method:** `getOrCreateSecretKey`
- **Transformation:** `AES/GCM/NoPadding`
- **CWE:** CWE-656 — Reliance on Security Through Obscurity

### 2.3 Production Debug Logging with incomplete masking — MEDIUM (CVSS 6.9)
- **Class:** `SafeNetworkLogInterceptor` (compiled to
  `SafeNetworkLogInterceptor.smali`)
- **Package:** `com.gov.mpparichai.auth.core.*`
- **Issue:** multiple `android.util.Log` calls that echo request/response
  bodies and user identifiers with masking the auditor judged incomplete
- **CWE:** CWE-532 — Insertion of Sensitive Information into Log File

Because all three live inside the shipped AAR, application teams cannot
remove them at source. They are currently the last remaining SAST items
that the application team cannot fully remediate on their own.

## 3. Application-side mitigation already in place

The FamilyWelfareApp build has been hardened so the vendor code paths
cannot leak from user flows in production:

- **For finding 2.1 (DEFAULT_ENC_DATA):** every call to
  `ParichaiAuth.login()` supplies a fresh `encData` returned by the
  backend `/AadhaarGateway/PrepareRequest` endpoint for that specific
  transaction (see `src/screens/BeneficiaryForm/index.js` and
  `src/api/AadhaarGatewayService.js`). The native bridge
  `ParichaiAuthModule.kt` additionally validates that `encData` is
  non-blank, does not contain placeholder tokens (`default_enc_data`,
  `sample`, `dummy`, `placeholder`, `test_enc_data`), and is at least
  64 characters long before invoking the SDK. Any short-circuit that
  would cause the SDK to fall back to its default is rejected upstream
  with an `INVALID_INPUT` error.

- **For finding 2.2 (parichai_auth_key alias):** ProGuard/R8 is enabled
  in release builds (see `android/app/proguard-rules.pro`), so `CryptoUtil`
  and its `getOrCreateSecretKey` method are renamed in the shipped smali.
  The literal string `"parichai_auth_key"` still exists in the DEX because
  ProGuard does not encrypt string constants, but the class + method
  context the scanner cited is no longer present.

- **For finding 2.3 (SafeNetworkLogInterceptor):** ProGuard rules also
  include `-assumenosideeffects` for `Log.v/.d/.i`, which strips those
  calls at compile time from the release APK. Our own JavaScript layer
  additionally runs through a runtime-safe logger
  (`src/utils/logger.js`) and a build-time `babel-plugin-transform-remove-console`
  pass so no `console.log` reaches Metro or logcat in release.

These mitigations mean the hardcoded values are unreachable or obfuscated
at runtime, but static analysis tools still flag their raw string presence
in the AAR bytes.

## 4. Requested changes to the SDK

Please issue an updated `parichai-auth-sdk-release.aar` that addresses all
three findings:

### 4.1 Remove or Keystore-back `DEFAULT_ENC_DATA` (finding 2.1)

**Option A (preferred).** Remove the `DEFAULT_ENC_DATA` field entirely and
require callers to supply `encData`, throwing a fail-fast exception when
it is missing.

**Option B.** Replace the hardcoded value with a runtime-derived secret
using the Android Keystore. Specifically:

1. Generate an `AES/GCM/NoPadding` key at first launch using
   `KeyGenParameterSpec` with `setUserAuthenticationRequired(false)` and
   `setInvalidatedByBiometricEnrollment(false)` so the SDK works
   headlessly.
2. Store the key in the AndroidKeyStore provider (never on disk, never as
   a source-code constant).
3. Encrypt the default payload with that key and decrypt it just-in-time
   inside `AuthRepository`.
4. Ensure the class does not expose the default field via reflection or
   public getters.

### 4.2 Derive the Keystore alias at runtime (finding 2.2)

The alias `"parichai_auth_key"` should not appear as a string constant in
the compiled AAR. Please replace it with a value that is derived at first
launch and persisted only inside the AndroidKeyStore metadata. For
example:

```kotlin
private val keyAlias: String by lazy {
    val prefs = context.getSharedPreferences("parichai_secure", MODE_PRIVATE)
    prefs.getString("k_alias", null) ?: run {
        val fresh = "pk_" + UUID.randomUUID().toString().replace("-", "")
        prefs.edit().putString("k_alias", fresh).apply()
        fresh
    }
}
```

This eliminates the CWE-656 finding because the alias is no longer visible
in static scans of the AAR.

### 4.3 Gate SafeNetworkLogInterceptor logs (finding 2.3)

- Replace direct `android.util.Log.d(...) / .i(...) / .v(...)` calls in
  `SafeNetworkLogInterceptor` with a wrapper that no-ops when
  `BuildConfig.DEBUG == false`.
- Or ship the class with `Log.d/.i/.v` calls removed at build time using
  the same `-assumenosideeffects` pattern the app now uses.
- Ensure any residual `Log.w/.e` never carries raw request/response
  bodies, tokens, or user identifiers.

### 4.4 Ship-time hardening

- Apply ProGuard/R8 name-obfuscation to internal fields and classes such
  as `DEFAULT_ENC_DATA`, `AuthRepository`, `CryptoUtil`, and
  `SafeNetworkLogInterceptor` so none are trivially discoverable in the
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
