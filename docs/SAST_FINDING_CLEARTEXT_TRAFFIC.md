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
`networkSecurityConfig` resource, and the app has been switched to
HTTPS. The current behaviour is:

### Release / production APK

`android/app/src/main/res/xml/network_security_config.xml`

- **Default:** cleartext is denied for every host.
- **Backend host (139.5.6.137):** cleartext still denied. TLS is required.
  The exact self-signed certificate the backend currently serves is
  pinned as a scoped trust anchor via `<certificates src="@raw/nhm_server" />`
  (see Section 3 for why this is a temporary bridge).

`android/app/src/main/AndroidManifest.xml` no longer contains
`android:usesCleartextTraffic`; instead it declares
`android:networkSecurityConfig="@xml/network_security_config"`.

Static-analysis scanners look for the `usesCleartextTraffic="true"`
attribute at the `<application>` level. Because that attribute is gone
and every domain-config now uses HTTPS with a trust anchor, the SAST
finding as literally described is closed.

### Debug builds

`android/app/src/debug/res/xml/network_security_config.xml` mirrors the
release trust anchor for 139.5.6.137 and additionally permits cleartext
for the local dev hosts (`localhost`, `127.0.0.1`, `10.0.2.2`, `10.0.3.2`)
so Metro bundler keeps working. This file is not packaged into the
release APK.

## 3. Temporary bridge: self-signed cert with hostname mismatch

The backend has enabled HTTPS but currently serves a **self-signed
certificate** whose Subject/Issuer is `CN=localhost` and whose only
SAN is `DNS:localhost`. Two things follow:

1. Android does not trust the cert (no CA chain).
2. Even after pinning, hostname verification would fail because the URL
   host `139.5.6.137` does not match the cert's `DNS:localhost` SAN.

To make development / testing usable while the backend team provisions
a proper CA-signed certificate, the app installs a custom
`OkHttpClientFactory` (`com/familywelfareapp/net/NhmSslClientFactory.kt`)
that:

- Uses the pinned `res/raw/nhm_server.pem` as the sole trust anchor for
  any HTTPS connection — a stolen or forged cert from anywhere else is
  still rejected.
- Tolerates the hostname mismatch **only for the single host
  `139.5.6.137`**. Every other host still goes through Android's normal
  strict hostname verification.

The factory is registered in `MainApplication.onCreate()` before React
Native touches the network stack.

Security-wise this is essentially certificate pinning with a
narrowly-scoped hostname allow-list. It is more restrictive than the
default CA store (only ONE certificate is accepted, not the entire
world's CAs), but the hostname override still gives an attacker who
somehow obtains the exact backend cert's private key the ability to
impersonate 139.5.6.137. Removal is described in Section 4.

## 4. Pending server-side action (required to fully close)

To fully close the finding and remove the temporary bridge, the backend
team must:

1. Provision a valid TLS certificate whose Subject Alternative Name
   matches the URL host — either:
   - A DNS name (recommended), e.g. `fpis-api.nhmmp.gov.in`, with a
     Let's Encrypt / DigiCert / GoI-issued certificate, and update
     `API_BASE_URL` in `src/constants/api.js` to that hostname; OR
   - A regenerated self-signed certificate that at least includes
     `subjectAltName = IP:139.5.6.137,DNS:localhost` while a proper CA
     cert is being procured. Command for the backend team:

     ```bash
     openssl req -x509 -newkey rsa:2048 -sha256 -days 1825 -nodes \
         -keyout server.key -out server.crt \
         -subj "/CN=139.5.6.137" \
         -addext "subjectAltName = IP:139.5.6.137,DNS:localhost"
     ```

2. Enable HTTPS on IIS 10, redirect all HTTP traffic to HTTPS, and
   disable TLS 1.0 / 1.1 (this also closes the matching VAPT findings
   on the server side).
3. Notify the app team so we can:
   - Replace `res/raw/nhm_server.pem` with the new certificate, OR
     remove the pinning block entirely once a public CA is used.
   - Delete `NhmSslClientFactory.kt` and its `register(...)` call from
     `MainApplication.onCreate()`.
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
