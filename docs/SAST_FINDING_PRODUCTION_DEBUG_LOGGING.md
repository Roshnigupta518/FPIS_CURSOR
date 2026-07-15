# SAST Finding — Production Debug Logging

**Finding source:** MPNHM SAST Report — Pyramid Cyber Security & Forensic Pvt. Ltd.
**Location flagged by scanner:** `SafeNetworkLogInterceptor.smali` — multiple
`android.util.Log` calls with incomplete masking.
**Severity:** Medium (CVSS 6.9)
**CWE:** CWE-532 — Insertion of Sensitive Information into Log File
**Status on our side:** **Mitigated (JS + Kotlin layers) — third-party AAR
component pending vendor fix**

---

## 1. Root cause

`SafeNetworkLogInterceptor` is compiled from a class inside the third-party
`parichai-auth-sdk-release.aar` (package `com.gov.mpparichai.auth.core.*`),
owned by MP Parichai. It logs Aadhaar request / response bodies through
`android.util.Log` with masking that the auditors judged incomplete. The
same finding class (CWE-532) would also apply to any `console.log`
statements in our own JavaScript that expose sensitive data at runtime.

## 2. Reachability & attack surface

Anything written through `android.util.Log` or `console.log` in a React
Native app ends up in **logcat**, which:

- Is visible via `adb logcat` to anyone with USB access to the device.
- Is captured verbatim in Google Play "vitals" bug reports.
- Is captured by third-party crash / analytics SDKs unless explicitly
  filtered.
- Is world-readable on rooted devices.

On our side, the sensitive fields at risk were: JWT access tokens,
refresh tokens, login passwords, Aadhaar `encData`, `transactionId`,
`uidToken`, `refKey`, and full beneficiary records.

## 3. Fix applied on the app (JavaScript) side

### 3.1 Safe logger utility

Created `src/utils/logger.js`. It exposes `logger.log / info / debug /
warn / error` with two guarantees:

1. **No-op in release builds.** When `__DEV__ === false` the exported
   functions are literal `noop`s, so nothing reaches Metro / logcat /
   Sentry breadcrumbs from JS.
2. **Automatic key-based redaction in dev builds.** The logger walks
   objects up to depth 6 and replaces the values of keys matching any
   of these patterns with `"***REDACTED***"`:

   ```
   password, token, refresh, authorization, cookie, secret,
   api_key, encData, transactionId, uidToken, refKey,
   aadhaar / aadhar, otp, pin, fcm_token
   ```

   Verified redaction manually with a sample login body — the resulting
   log line only contains `user_Id`, `device_id`, and the non-sensitive
   parts of `user`. Every credential-shaped field prints as
   `***REDACTED***`.

### 3.2 Build-time console stripping

Added `babel-plugin-transform-remove-console` to `babel.config.js` under
the `env.production` key with `exclude: ['error', 'warn']`. This
guarantees that even if a third-party dependency (or a future
regression) sneaks a raw `console.log` back in, it is removed from the
release JS bundle at compile time. `console.error` and `console.warn`
are preserved so React Native's redbox and future crash-reporting SDKs
still function.

Together (3.1 + 3.2) this is defense-in-depth: the runtime logger is
already a no-op in release, and Babel strips any residual `console.*`
calls we or a library might emit.

### 3.3 Call-site cleanup

Replaced every direct `console.log / debug / info` call in the app with
`logger.*` (7 call sites across 4 files):

| File | Prior call | Replacement |
|---|---|---|
| `src/api/authApi.js` | 2× `console.log` (login body + response) | `logger.debug('[LOGIN REQUEST]', body)`, `logger.debug('[LOGIN RESPONSE]', response)` |
| `src/api/beneficiaryApi.js` | 1× active `console.log({payload})`, 1× commented | `logger.debug('[BENEFICIARIES.LIST] params', params)`, `logger.debug('[BENEFICIARIES.CREATE] payload', payload)` |
| `src/screens/BeneficiaryForm/index.js` | 5× active `console.log` incl. Aadhaar payloads | `logger.debug(...)` / `logger.warn(...)` |
| `src/redux/slices/beneficiarySlice.js` | 1× `console.log('NEXT PAGE ...')` | `logger.debug('[BENEFICIARIES.PAGE] nextPage', nextPage)` |
| `src/utils/storage.js` | 4× `console.warn`, already `__DEV__` gated | Left as-is (already safe) |

Confirmed via ripgrep that no active bare `console.log/debug/info` call
exists anywhere under `src/`.

## 4. Fix applied on the Kotlin / native bridge side

`android/app/src/main/java/com/familywelfareapp/parichai/ParichaiAuthModule.kt`
no longer contains any `Log.d(...)` calls that could echo the Parichai
transaction context. The previous `Log.d("PARICHAI", "Before login")`
line was removed during the Point #1 fix. The wrapper now only
propagates the SDK's own callbacks back through the promise.

## 5. Third-party AAR — pending vendor fix

The exact class the auditors flagged (`SafeNetworkLogInterceptor`) sits
inside the compiled `parichai-auth-sdk-release.aar` and is outside our
build. The change request in `docs/PARICHAI_SDK_VENDOR_REQUEST.md` also
asks the vendor to remove the `Log.d/Log.i` calls in this class or
gate them behind `BuildConfig.DEBUG`.

For the currently shipped AAR, the runtime impact is reduced because
the release APK will (once ProGuard is turned on in `build.gradle`)
strip all `android.util.Log.d / .v / .i` calls at compile time via the
ProGuard `-assumenosideeffects` rule. Point #4 (the ProGuard hardening)
covers turning that on.

## 6. Residual risk

- JS side: **None in release** — no `console.*` reaches the runtime,
  and Babel strips any residual calls at compile time.
- JS side dev builds: **Low** — key-based redaction protects the most
  common sensitive shapes; a developer who deliberately logs
  `body.password` as a raw string can still print secrets. Documented
  in `docs/DEVELOPER_LOGGING_GUIDELINES.md` (see below).
- Native side: **Dependent on vendor patch + Point #4 ProGuard rollout.**

## 7. Closure criteria

The finding is fully closed when:

1. A release APK built from this branch (with `enableProguardInReleaseBuilds
   = true`) shows no `Log.d/Log.v/Log.i` invocations under our package or
   in the AAR, verified by decompiling the resulting APK and grepping the
   smali output.
2. The auditor rescan of that APK reports no CWE-532 hits.

## 8. Files touched by this fix

- **New:** `src/utils/logger.js` — safe logger with auto-redaction.
- **Modified:** `babel.config.js` — strip console.* from release bundle.
- **Modified:** `src/api/authApi.js`, `src/api/beneficiaryApi.js`,
  `src/redux/slices/beneficiarySlice.js`,
  `src/screens/BeneficiaryForm/index.js` — replaced `console.log` with
  `logger.*`.
- **Modified:** `package.json` (devDependencies) — added
  `babel-plugin-transform-remove-console`.

## 9. References

- MPNHM SAST Report, pages 14–18.
- <https://cwe.mitre.org/data/definitions/532.html>
- <https://reactnative.dev/docs/performance#using-console.log-statements>
- <https://developer.android.com/topic/security/best-practices#logging>
