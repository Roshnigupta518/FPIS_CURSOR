# SAST Finding — Hardcoded Encrypted Payload (DEFAULT_ENC_DATA)

**Finding source:** MPNHM SAST Report — Pyramid Cyber Security & Forensic Pvt. Ltd.
**Location flagged by scanner:** `AuthRepository.smali` — field `DEFAULT_ENC_DATA`
**Severity:** High (CVSS 7.7)
**CWE:** CWE-798 — Use of Hard-coded Credentials
**Status on our side:** **Mitigated — pending vendor patch**

---

## 1. Root cause

`AuthRepository` is compiled from a class inside the third-party AAR
`android/app/libs/parichai-auth-sdk-release.aar`. Its package is
`com.gov.mpparichai.auth.core.*`, owned by **MP Parichai (Government of
Madhya Pradesh)**. The application team consumes this AAR as a binary
dependency; the source is not available to us and the field cannot be
removed by rebuilding the app.

The hardcoded value in `DEFAULT_ENC_DATA` is an encrypted authentication
payload that the SDK falls back to when a caller does not supply a fresh
`encData` for the current transaction.

## 2. Reachability analysis

**The vendor default is unreachable from any FamilyWelfareApp flow.** Two
independent guards enforce this:

### 2.1 JS layer — always sends server-issued `encData`

`src/screens/BeneficiaryForm/index.js` fetches a fresh transaction from
the backend and forwards its `encData` to the SDK on every call:

```js
const aadhaar = await prepareAadhaarRequest({ serviceType: 6 });
// ...
const sdkResponse = await startParichaiAuth({
  sa: aadhaar.sa,
  serviceType: String(aadhaar.serviceType),
  encData: aadhaar.encData,        // fresh per-transaction blob from server
  transactionId: aadhaar.transactionId,
  disclosureInfoType: String(aadhaar.disclosureInfoType ?? 1),
  environment: 'PREPROD',
});
```

`prepareAadhaarRequest` (`src/api/AadhaarGatewayService.js`) hits
`/AadhaarGateway/PrepareRequest` on every invocation, so `encData` is
never cached or hardcoded on the client.

### 2.2 Native bridge layer — validates before forwarding

`android/app/src/main/java/com/familywelfareapp/parichai/ParichaiAuthModule.kt`
short-circuits any call that could trigger the SDK's default:

- `encData` must be non-blank after trimming.
- `encData` must not contain any of the placeholder tokens
  `default_enc_data`, `sample`, `dummy`, `placeholder`, `test_enc_data`.
- `encData` must be at least 64 characters long (server blobs are much
  longer than this; anything shorter is treated as an obvious placeholder).
- `sa`, `serviceType`, and `transactionId` must also be non-blank.

If any check fails, the native module rejects the JS promise with
`INVALID_INPUT` **before** `ParichaiAuth.login()` is called, so the SDK
never gets a chance to substitute its baked-in default.

## 3. Action taken on our side

1. Hardened `ParichaiAuthModule.kt` with the validator described above.
2. Filed a change request with the Parichai SDK vendor
   (`docs/PARICHAI_SDK_VENDOR_REQUEST.md`) asking them to remove
   `DEFAULT_ENC_DATA` and move to a Keystore-backed secret.
3. Documented the finding here so the audit team can trace the mitigation
   and the pending vendor dependency.

## 4. Residual risk

Because the constant still exists in the AAR bytes on disk, a
reverse-engineer can extract the value. However, without also possessing
the matching server-side symmetric key and a valid transaction context,
the extracted blob cannot be used to authenticate a real request against
the MP Parichai backend. The value alone does not grant access.

Residual risk classification: **Low — dependent on vendor patch**.

## 5. Closure criteria

This finding can be closed once **either** of the following happens:

1. MP Parichai releases an updated `parichai-auth-sdk-release.aar` that no
   longer contains a hardcoded `DEFAULT_ENC_DATA` field (or moves it into
   an obfuscated / Keystore-backed store), and the audit team re-scans the
   APK.
2. The audit team accepts the residual risk based on the reachability
   analysis in Section 2 and the mitigations in Section 3.

## 6. References

- MPNHM SAST Report — Pyramid Cyber Security & Forensic Pvt. Ltd.
- `android/app/src/main/java/com/familywelfareapp/parichai/ParichaiAuthModule.kt`
- `src/screens/BeneficiaryForm/index.js`
- `src/api/AadhaarGatewayService.js`
- `docs/PARICHAI_SDK_VENDOR_REQUEST.md`
