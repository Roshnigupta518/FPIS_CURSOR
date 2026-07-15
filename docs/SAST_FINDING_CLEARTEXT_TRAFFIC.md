# SAST Finding — Cleartext Traffic Globally Permitted

**Finding source:** MPNHM SAST Report — Pyramid Cyber Security & Forensic Pvt. Ltd.
**Location flagged by scanner:** `AndroidManifest.xml` — `android:usesCleartextTraffic="true"`
**Severity:** Medium (CVSS 6.9)
**CWE:** CWE-319 — Cleartext Transmission of Sensitive Information
**Status on our side:** **Mitigated — pending server-side HTTPS rollout**

---

## 1. Root cause

The application shipped with `android:usesCleartextTraffic="true"` on the
`<application>` element in `AndroidManifest.xml`. That single attribute
globally permits HTTP traffic to any host, which is what the scanner
detected.

The underlying reason is that the backend API is currently served over
plain HTTP:

```
http://139.5.6.137/FPIS_API_APP/api
```

The app therefore needed cleartext permitted globally, otherwise
release builds could not reach the backend at all.

## 2. Fix applied on the app side

The global attribute has been removed and replaced with a scoped Android
`networkSecurityConfig` resource. The behaviour is now:

### Release / production APK

`android/app/src/main/res/xml/network_security_config.xml`

- **Default:** cleartext is denied for every host.
- **Scoped exception:** cleartext is permitted **only** for `139.5.6.137`
  (documented as temporary — see Section 3).
- Trust anchor: system CA store (default).

`android/app/src/main/AndroidManifest.xml` no longer contains
`android:usesCleartextTraffic`; instead it declares
`android:networkSecurityConfig="@xml/network_security_config"`.

Static-analysis scanners look for the `usesCleartextTraffic="true"`
attribute at the `<application>` level. Because that attribute is gone,
the SAST finding as literally described is closed. Any remaining risk
is now visibly scoped to a single IP with a documented remediation path.

### Debug builds

`android/app/src/debug/AndroidManifest.xml` overrides the config to
`android/app/src/debug/res/xml/network_security_config.xml`, which
permits cleartext for `localhost`, `127.0.0.1`, `10.0.2.2`, `10.0.3.2`
and `139.5.6.137` so Metro bundler and the current dev backend keep
working. This file is not packaged into the release APK.

## 3. Pending server-side action (required to fully close)

The scoped cleartext exception for `139.5.6.137` is a temporary bridge.
To fully close the finding the backend team must:

1. Provision a valid TLS certificate for the production hostname
   (either the raw IP with a CA that supports IP-SAN certificates, or
   preferably a DNS name such as `fpis-api.nhmmp.gov.in` with a
   DigiCert / Let's Encrypt / GoI-issued certificate).
2. Enable HTTPS on IIS 10, redirect all HTTP traffic to HTTPS, and
   disable TLS 1.0 / 1.1 (this also closes the matching VAPT findings
   on the server side).
3. Notify the app team so we can:
   - Change `API_BASE_URL` in `src/constants/api.js` from `http://` to
     `https://`.
   - **Delete** the `<domain-config>` block from
     `android/app/src/main/res/xml/network_security_config.xml`.
   - Cut a new release build and share the fresh SAST scan.

## 4. Residual risk

Until step 3 completes, real authentication tokens and Aadhaar
transaction blobs still travel over HTTP between the app and
`139.5.6.137`. On the app side we cannot change that; a scoped
exception at least prevents a rogue library or ad SDK from opening
new cleartext channels to arbitrary hosts.

Residual risk classification: **Medium — dependent on server-side TLS
rollout**.

## 5. Closure criteria

The finding is fully closed when:

1. `139.5.6.137` (or its DNS equivalent) is reachable over HTTPS with a
   valid, non-self-signed certificate, AND
2. `network_security_config.xml` no longer contains any
   `cleartextTrafficPermitted="true"` block, AND
3. A fresh SAST scan of the resulting APK reports no
   `usesCleartextTraffic` and no cleartext domain exceptions.

## 6. Files touched by this fix

- `android/app/src/main/AndroidManifest.xml` — removed
  `usesCleartextTraffic="true"`, added `networkSecurityConfig` reference.
- `android/app/src/main/res/xml/network_security_config.xml` — new,
  release config.
- `android/app/src/debug/AndroidManifest.xml` — added `tools:replace`
  override for debug builds.
- `android/app/src/debug/res/xml/network_security_config.xml` — new,
  debug config.

## 7. References

- MPNHM SAST Report, pages 12–13.
- <https://developer.android.com/training/articles/security-config>
- <https://cwe.mitre.org/data/definitions/319.html>
