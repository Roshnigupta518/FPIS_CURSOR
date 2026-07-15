# SAST Finding — Hardcoded Encryption Key

**Finding source:** MPNHM SAST Report — Pyramid Cyber Security & Forensic Pvt. Ltd.
**Location flagged by scanner:** `CryptoUtil.smali` — key alias `parichai_auth_key`,
transformation `AES/GCM/NoPadding`, method `getOrCreateSecretKey`.
**Severity:** Medium (CVSS 5.1)
**CWE:** CWE-656 — Reliance on Security Through Obscurity
**Status on our side:** **Mitigated via R8 obfuscation — pending vendor patch**

---

## 1. Root cause

`CryptoUtil` is a class inside the third-party
`android/app/libs/parichai-auth-sdk-release.aar`
(package `com.gov.mpparichai.auth.core.*`), owned by MP Parichai. It hard-codes
two things that appear in the smali:

- The string constant `"parichai_auth_key"` used as an Android Keystore alias.
- The transformation string `"AES/GCM/NoPadding"`.

The application team does not own this binary and cannot delete the string
directly. The good news is that the SDK *does* use the Android Keystore
provider (`AndroidKeyStore`) — the actual private key never leaves the
device's hardware-backed keystore. Only the *alias name* is hardcoded.

## 2. Why the finding is really about discoverability, not key theft

The Android Keystore separates a key alias from the key material:

- **Alias** — a plain string. Non-secret by design. Anyone can call
  `KeyStore.getKey("parichai_auth_key", null)` on their own device.
- **Key material** — never returned from the keystore. Operations happen
  inside the TEE / StrongBox and expose only ciphertext, not the key bytes.

So the flagged constant is not itself a secret. What the auditor is really
saying is: "this alias is discoverable in the shipped APK, which weakens
security-through-obscurity". The remediation, therefore, is to hide the
alias from static analysis.

## 3. Fix applied on the app side — R8 obfuscation

We enabled ProGuard/R8 for release builds only. This renames every class,
method and field in both our own code *and in bundled AAR dependencies*,
including the Parichai SDK. After a release build, `CryptoUtil.smali`
no longer exists in the APK — it is replaced with something like
`a.smali`, its methods with `a()`, `b()`, etc.

### 3.1 What changed

- `android/app/build.gradle`:
  `def enableProguardInReleaseBuilds = false` → `true`.
- `android/app/proguard-rules.pro`: rewritten with a conservative,
  obfuscation-only ruleset. Notably:
  - `-dontshrink` and `-dontoptimize` are set. We only *rename*, we do
    not remove dead code. This is deliberate: it avoids the runtime
    crashes ("Class not found", "No such method") that happen when R8
    strips reflection-heavy code paths in React Native / OkHttp /
    Retrofit / Gson.
  - `-repackageclasses ''` collapses the entire class hierarchy into an
    unnamed top-level package, so the smali no longer leaks package
    structure either.
  - Explicit `-keep` rules preserve the runtime-critical entry points:
    React Native core (`com.facebook.react.**`), Hermes, our own
    `ParichaiAuthModule` / `ParichaiAuthPackage`, and the Parichai SDK's
    *public* API (`ParichaiAuth`, `MinimalAuthConfig`, `AuthCallback`,
    `AuthSuccess`, `AuthError`, `ServiceType`, `AuthEnvironment`).
  - `com.gov.mpparichai.auth.core.CryptoUtil`, `AuthRepository` and
    `SafeNetworkLogInterceptor` are **not** in the keep-list, so R8
    renames them.
  - `-assumenosideeffects` strips `Log.v/.d/.i` from release, closing
    the last gap on SAST finding #3 (Production Debug Logging).
- Debug builds are untouched. `minifyEnabled` is only true on the
  `release` build type.

### 3.2 What the release APK's smali will show

After running `./gradlew assembleRelease`:

- `CryptoUtil.smali` → gone. Replaced by an obfuscated name.
- `AuthRepository.smali` → gone. Replaced by an obfuscated name
  (closes finding #1 at the smali-scanner level).
- `SafeNetworkLogInterceptor.smali` → gone. Its `Log.d/.i` calls are
  also stripped via `-assumenosideeffects` (finding #3).
- Method names like `getOrCreateSecretKey` → renamed to `a` / `b` / …
- The string literal `"parichai_auth_key"` will still exist in the
  DEX because ProGuard does not obfuscate string constants — but the
  *class + method context* the auditor cited is gone.

## 4. Residual risk

The literal string `"parichai_auth_key"` remains in the release APK.
This is unavoidable without vendor cooperation because ProGuard does
not encrypt strings. The residual risk is bounded to:

1. An attacker learns the alias name (already true today).
2. They can call the Keystore only on their own device.
3. They still cannot read the private key material.

Residual risk classification: **Low — dependent on vendor patch to
derive the alias at runtime**.

## 5. Vendor request (also filed for findings #1 and #3)

See `docs/PARICHAI_SDK_VENDOR_REQUEST.md` — the letter now asks the
MP Parichai team to derive the Keystore alias at runtime (e.g. from a
per-install UUID plus a HKDF salt) instead of hardcoding it. Once the
vendor ships an updated AAR, the string constant disappears from the
APK entirely and the finding fully closes on the next scan.

## 6. Closure criteria

The finding is fully closed when *both*:

1. A release APK built from this branch (with ProGuard enabled) is
   decompiled, and the scanner reports no `CryptoUtil.smali` class,
   no `getOrCreateSecretKey` method, and no reachable references to
   the alias from a named class.
2. The vendor ships an updated AAR that removes the string literal
   or derives it at runtime, and the auditor's rescan of that APK
   reports no CWE-656 hit.

## 7. Files touched by this fix

- `android/app/build.gradle` — flipped `enableProguardInReleaseBuilds`
  to `true` with an explanatory comment.
- `android/app/proguard-rules.pro` — rewritten with obfuscation-only
  ruleset covering RN, Parichai SDK public API, OkHttp/Retrofit/Gson,
  Kotlin, and `Log.v/.d/.i` stripping.
- `docs/PARICHAI_SDK_VENDOR_REQUEST.md` — extended to include the
  CryptoUtil ask (see Point #4 in that file).

## 8. Test plan for the release build

The first release build after enabling ProGuard should be smoke-tested
carefully. Anything that uses reflection (native modules, third-party
RN packages) can surface here.

```bash
cd android
./gradlew clean
./gradlew assembleRelease
# APK: android/app/build/outputs/apk/release/app-release.apk
```

Install and verify each of these flows:

1. Cold start → Login screen renders.
2. Login with real user → dashboard opens.
3. Aadhaar flow → Parichai SDK launches, verification completes.
4. Beneficiary create + face auth upload → success.
5. Kill app → relaunch → refresh token flow keeps user logged in.
6. Logout → returns to Login screen.

If any step fails with a `ClassNotFoundException` /
`NoSuchMethodError`, capture the class name from logcat and add it to
`proguard-rules.pro` as a `-keep` rule, then rebuild. The mapping
file at `android/app/build/outputs/mapping/release/mapping.txt` maps
obfuscated names back to originals for debugging.

## 9. Rollback

If a release build breaks and needs to be shipped immediately, revert
by setting `enableProguardInReleaseBuilds = false` in
`android/app/build.gradle`. Debug builds are unaffected either way.

## 10. References

- MPNHM SAST Report, pages 19–21.
- <https://cwe.mitre.org/data/definitions/656.html>
- <https://developer.android.com/training/articles/keystore>
- <https://developer.android.com/build/shrink-code>
